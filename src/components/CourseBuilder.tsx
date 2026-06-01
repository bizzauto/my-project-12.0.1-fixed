import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Users, Clock, BarChart3 } from 'lucide-react';

const mockCourses = [
  { id: '1', title: 'Getting Started with BizzAuto', modules: 5, students: 142, progress: 78 },
  { id: '2', title: 'Advanced Marketing Automation', modules: 8, students: 89, progress: 45 },
  { id: '3', title: 'Social Media Mastery', modules: 6, students: 234, progress: 92 },
];

export default function CourseBuilder() {
  const navigate = useNavigate();
  const [courses] = useState(mockCourses);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          </div>
          <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all">
            <Plus size={18} />
            New Course
          </button>
        </div>
      </div>
      <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course) => (
          <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen size={22} className="text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{course.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1"><BookOpen size={14} /> {course.modules} modules</span>
              <span className="flex items-center gap-1"><Users size={14} /> {course.students}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" style={{ width: `${course.progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{course.progress}% complete</p>
          </div>
        ))}
      </div>
    </div>
  );
}
