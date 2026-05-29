import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all workflows
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { executions: true },
          },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        workflows,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
      details: error.message,
    });
  }
});

// Get single workflow with nodes and edges
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow',
      details: error.message,
    });
  }
});

// Create workflow
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, triggerType, triggerConfig, nodes, edges } = req.body;

    if (!name || !triggerType) {
      return res.status(400).json({
        success: false,
        error: 'Name and trigger type are required',
      });
    }

    const validTriggerTypes = [
      'message_received',
      'lead_created',
      'appointment_booked',
      'form_subscribed',
      'tag_added',
      'deal_stage_changed',
      'manual',
    ];

    if (!validTriggerTypes.includes(triggerType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`,
      });
    }

    const workflow = await prisma.workflow.create({
      data: {
        businessId: req.user.businessId,
        name,
        description,
        triggerType,
        triggerConfig: triggerConfig || {},
        nodes: nodes || [],
        edges: edges || [],
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow',
      details: error.message,
    });
  }
});

// Update workflow
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const { name, description, nodes, edges, triggerType, triggerConfig } = req.body;

    if (triggerType) {
      const validTriggerTypes = [
        'message_received',
        'lead_created',
        'appointment_booked',
        'form_subscribed',
        'tag_added',
        'deal_stage_changed',
        'manual',
      ];

      if (!validTriggerTypes.includes(triggerType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`,
        });
      }
    }

    const updated = await prisma.workflow.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(triggerType !== undefined && { triggerType }),
        ...(triggerConfig !== undefined && { triggerConfig }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow',
      details: error.message,
    });
  }
});

// Toggle workflow active state
router.patch('/:id/toggle', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const updated = await prisma.workflow.update({
      where: { id: req.params.id },
      data: { isActive: !workflow.isActive },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Toggle workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle workflow',
      details: error.message,
    });
  }
});

// Delete workflow
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    if (workflow.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an active workflow. Deactivate it first.',
      });
    }

    await prisma.workflow.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow',
      details: error.message,
    });
  }
});

// Execute workflow manually
router.post('/:id/run', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const nodes = workflow.nodes as any[];
    const edges = workflow.edges as any[];

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Workflow has no nodes to execute',
      });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        businessId: req.user.businessId,
        workflowId: workflow.id,
        status: 'running',
        triggerData: req.body.triggerData || { source: 'manual', triggeredBy: req.user.id },
        nodeResults: {},
      },
    });

    // Simulate node execution
    const nodeResults: Record<string, any> = {};

    // Build adjacency list from edges
    const adjacencyList: Record<string, string[]> = {};
    for (const edge of edges) {
      const sourceId = edge.source || edge.sourceNodeId;
      const targetId = edge.target || edge.targetNodeId;
      if (sourceId && targetId) {
        if (!adjacencyList[sourceId]) adjacencyList[sourceId] = [];
        adjacencyList[sourceId].push(targetId);
      }
    }

    // Find root nodes (no incoming edges)
    const targetIds = new Set(edges.map((e: any) => e.target || e.targetNodeId));
    const rootNodes = nodes.filter((n: any) => !targetIds.has(n.id));

    // BFS traversal from root nodes
    const queue: string[] = rootNodes.map((n: any) => n.id);
    const visited = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) continue;

      const nodeType = node.type || node.data?.type || 'unknown';

      // Simulate execution result based on node type
      nodeResults[nodeId] = {
        nodeType,
        label: node.data?.label || node.label || nodeType,
        status: 'completed',
        executedAt: new Date().toISOString(),
        output: simulateNodeOutput(nodeType, node.data),
      };

      // Enqueue children
      const children = adjacencyList[nodeId] || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    // Mark unvisited nodes as skipped
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        nodeResults[node.id] = {
          nodeType: node.type || node.data?.type || 'unknown',
          label: node.data?.label || node.label || 'Unknown',
          status: 'skipped',
          executedAt: new Date().toISOString(),
          output: null,
        };
      }
    }

    // Update execution with results
    const completedExecution = await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        nodeResults,
        completedAt: new Date(),
      },
    });

    // Update workflow run stats
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        execution: completedExecution,
        nodeResults,
      },
    });
  } catch (error: any) {
    console.error('Run workflow error:', error);

    // Mark execution as failed if it was created
    try {
      const executionId = (error as any).executionId;
      if (executionId) {
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          },
        });
      }
    } catch (updateError) {
      console.error('Failed to update execution status:', updateError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to run workflow',
      details: error.message,
    });
  }
});

// Get workflow execution history
router.get('/:id/runs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { workflowId: workflow.id },
        skip,
        take: Number(limit),
        orderBy: { startedAt: 'desc' },
      }),
      prisma.workflowExecution.count({
        where: { workflowId: workflow.id },
      }),
    ]);

    res.json({
      success: true,
      data: {
        executions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get workflow runs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow runs',
      details: error.message,
    });
  }
});

// Get single execution details
router.get('/executions/:executionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: req.params.executionId,
        businessId: req.user.businessId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            triggerType: true,
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    console.error('Get execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch execution details',
      details: error.message,
    });
  }
});

// Execute workflow by trigger type (public/internal endpoint)
router.post('/execute', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, triggerType, triggerData } = req.body;

    if (!businessId || !triggerType) {
      return res.status(400).json({
        success: false,
        error: 'Business ID and trigger type are required',
      });
    }

    // Find active workflows matching the trigger type
    const workflows = await prisma.workflow.findMany({
      where: {
        businessId,
        triggerType,
        isActive: true,
      },
    });

    if (workflows.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No active workflows found for this trigger type',
          executionsCreated: 0,
        },
      });
    }

    const executions: any[] = [];

    for (const workflow of workflows) {
      const nodes = workflow.nodes as any[];
      const edges = workflow.edges as any[];

      if (!Array.isArray(nodes) || nodes.length === 0) continue;

      // Check trigger config conditions
      if (workflow.triggerConfig && typeof workflow.triggerConfig === 'object') {
        const config = workflow.triggerConfig as any;
        let shouldExecute = true;

        // Keyword matching for message_received triggers
        if (triggerType === 'message_received' && config.keywords && triggerData?.message) {
          const keywords = Array.isArray(config.keywords) ? config.keywords : [config.keywords];
          const messageText = (triggerData.message as string).toLowerCase();
          shouldExecute = keywords.some((kw: string) => messageText.includes(kw.toLowerCase()));
        }

        // Tag matching for tag_added triggers
        if (triggerType === 'tag_added' && config.tags && triggerData?.tag) {
          const tags = Array.isArray(config.tags) ? config.tags : [config.tags];
          shouldExecute = tags.includes(triggerData.tag);
        }

        if (!shouldExecute) continue;
      }

      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          businessId,
          workflowId: workflow.id,
          status: 'running',
          triggerData: triggerData || { source: 'trigger', triggerType },
          nodeResults: {},
        },
      });

      // Simulate node execution
      const nodeResults: Record<string, any> = {};

      const adjacencyList: Record<string, string[]> = {};
      for (const edge of edges) {
        const sourceId = edge.source || edge.sourceNodeId;
        const targetId = edge.target || edge.targetNodeId;
        if (sourceId && targetId) {
          if (!adjacencyList[sourceId]) adjacencyList[sourceId] = [];
          adjacencyList[sourceId].push(targetId);
        }
      }

      const targetIds = new Set(edges.map((e: any) => e.target || e.targetNodeId));
      const rootNodes = nodes.filter((n: any) => !targetIds.has(n.id));

      const queue: string[] = rootNodes.map((n: any) => n.id);
      const visited = new Set<string>();

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodes.find((n: any) => n.id === nodeId);
        if (!node) continue;

        const nodeType = node.type || node.data?.type || 'unknown';

        nodeResults[nodeId] = {
          nodeType,
          label: node.data?.label || node.label || nodeType,
          status: 'completed',
          executedAt: new Date().toISOString(),
          output: simulateNodeOutput(nodeType, node.data),
        };

        const children = adjacencyList[nodeId] || [];
        for (const childId of children) {
          if (!visited.has(childId)) {
            queue.push(childId);
          }
        }
      }

      for (const node of nodes) {
        if (!visited.has(node.id)) {
          nodeResults[node.id] = {
            nodeType: node.type || node.data?.type || 'unknown',
            label: node.data?.label || node.label || 'Unknown',
            status: 'skipped',
            executedAt: new Date().toISOString(),
            output: null,
          };
        }
      }

      const completedExecution = await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          nodeResults,
          completedAt: new Date(),
        },
      });

      await prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
        },
      });

      executions.push(completedExecution);
    }

    res.json({
      success: true,
      data: {
        executionsCreated: executions.length,
        executions,
      },
    });
  } catch (error: any) {
    console.error('Execute workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute workflows',
      details: error.message,
    });
  }
});

// Simulate output for different node types
function simulateNodeOutput(nodeType: string, data?: any): any {
  switch (nodeType) {
    case 'trigger':
      return { triggered: true, timestamp: new Date().toISOString() };
    case 'condition':
      return { evaluated: true, result: true, path: 'true' };
    case 'action':
      return { executed: true, action: data?.action || 'default_action' };
    case 'send_message':
      return { sent: true, to: data?.recipient || 'contact', message: data?.message || 'Template message' };
    case 'send_email':
      return { sent: true, to: data?.email || 'user@example.com', subject: data?.subject || 'Email sent' };
    case 'update_contact':
      return { updated: true, fields: data?.fields || {} };
    case 'add_tag':
      return { tagged: true, tags: data?.tags || [] };
    case 'remove_tag':
      return { untagged: true, tags: data?.tags || [] };
    case 'wait':
      return { waited: true, duration: data?.duration || '1h' };
    case 'webhook':
      return { called: true, url: data?.url || 'https://example.com/webhook', status: 200 };
    case 'delay':
      return { delayed: true, duration: data?.duration || '1h' };
    case 'create_deal':
      return { created: true, dealTitle: data?.title || 'New Deal' };
    case 'move_deal':
      return { moved: true, stage: data?.stage || 'qualification' };
    case 'notify_team':
      return { notified: true, team: data?.team || 'sales' };
    case 'ai_response':
      return { generated: true, model: data?.model || 'default', response: 'AI processed' };
    default:
      return { processed: true, type: nodeType };
  }
}

export default router;
