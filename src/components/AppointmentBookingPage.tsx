import { useState } from 'react';
import { useToast } from '../components/Toast';
import { Calendar, Clock, User, Phone, Mail, Copy, Code, CheckCircle2, Settings, Globe } from 'lucide-react';

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
}

export default function AppointmentBookingPage() {
  const toast = useToast();
  const [types, setTypes] = useState<AppointmentType[]>([
    { id: '1', name: 'Consultation', duration: 30, price: 0, active: true },
    { id: '2', name: 'Service Appointment', duration: 60, price: 500, active: true },
  ]);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="${window.location.origin}/booking-widget" width="100%" height="600" frameborder="0"></iframe>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" /> Appointment Booking Widget
          </h1>
          <p className="text-gray-600 mt-1">Embeddable booking widget for your website</p>
        </div>
        <button
          onClick={() => setShowEmbed(!showEmbed)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Code size={18} /> Get Embed Code
        </button>
      </div>

      {/* Embed Code */}
      {showEmbed && (
        <div className="bg-gray-900 rounded-xl p-4 mb-6 flex items-center justify-between">
          <code className="text-green-400 text-sm overflow-x-auto flex-1">{embedCode}</code>
          <button onClick={copyEmbed} className="ml-3 p-2 text-white hover:bg-gray-700 rounded-lg shrink-0">
            {copied ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Appointment Types</h3>
          <div className="space-y-3">
            {types.map((type) => (
              <div key={type.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <div className="font-medium text-gray-900">{type.name}</div>
                  <div className="text-sm text-gray-500">{type.duration} min • {type.price === 0 ? 'Free' : `₹${type.price}`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${type.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <button className="text-sm text-blue-600 hover:underline">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Widget Preview</h3>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-gray-900">Book an Appointment</div>
              <div className="text-sm text-gray-500">Select a service and pick a time</div>
            </div>
            <div className="space-y-2 mb-4">
              {types.filter(t => t.active).map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                  <div>
                    <div className="font-medium text-sm">{type.name}</div>
                    <div className="text-xs text-gray-500">{type.duration} min</div>
                  </div>
                  <div className="text-sm font-medium">{type.price === 0 ? 'Free' : `₹${type.price}`}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-400">
              Calendar view loads here...
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Settings size={18} /> Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
              <div className="text-sm text-gray-600">Mon-Sat: 9:00 AM - 6:00 PM</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
              <div className="text-sm text-gray-600 flex items-center gap-1"><Globe size={14} /> Asia/Kolkata (IST)</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Time</label>
              <div className="text-sm text-gray-600">15 minutes between appointments</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation</label>
              <div className="text-sm text-gray-600">Auto-confirm via WhatsApp + Email</div>
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
          <div className="space-y-3">
            {[
              { name: 'Priya Sharma', service: 'Consultation', time: 'Today, 2:00 PM', phone: '+91 98765 43210' },
              { name: 'Raj Patel', service: 'Service Appointment', time: 'Today, 4:30 PM', phone: '+91 87654 32109' },
              { name: 'Anita Desai', service: 'Consultation', time: 'Tomorrow, 10:00 AM', phone: '+91 76543 21098' },
            ].map((apt, i) => (
              <div key={i} className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                  {apt.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{apt.name}</div>
                  <div className="text-xs text-gray-500">{apt.service} • {apt.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}