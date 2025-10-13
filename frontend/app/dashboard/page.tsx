'use client';

import { Home, BookOpen, TrendingUp, Brain } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';

export default function Dashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r min-h-screen p-6">
          <nav className="space-y-2">
            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-purple-200 text-gray-900">
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700">
              <BookOpen className="w-5 h-5" />
              <span>Study Plan</span>
            </button>

            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700">
              <TrendingUp className="w-5 h-5" />
              <span>Progress</span>
            </button>

            <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-100 text-purple-500">
              <Brain className="w-5 h-5" />
              <span>Mind Map</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          <h1 className="text-4xl font-semibold mb-8">Dashboard</h1>

          {/* Top Cards */}
          <div className="flex gap-6 mb-12">
            <div className="w-36 h-52 rounded-3xl bg-gradient-to-br from-yellow-200 to-yellow-300 p-4 flex flex-col justify-end">
              <h3 className="font-semibold text-gray-900">Lorem Lorem</h3>
              <p className="text-sm text-gray-700">12 tests</p>
            </div>

            <div className="w-36 h-52 rounded-3xl bg-gradient-to-br from-blue-300 to-blue-400 p-4 flex flex-col justify-end">
              <h3 className="font-semibold text-gray-900">Lorem Lorem</h3>
              <p className="text-sm text-gray-700">12 tests</p>
            </div>

            <div className="w-36 h-52 rounded-3xl bg-gradient-to-br from-purple-300 to-purple-400 p-4 flex flex-col justify-end">
              <h3 className="font-semibold text-gray-900">Lorem Lorem</h3>
              <p className="text-sm text-gray-700">12 tests</p>
            </div>
          </div>

          {/* Session List */}
          <div className="max-w-2xl">
            <div className="mb-4">
              <h2 className="text-3xl font-semibold">Lorem Ipsum</h2>
              <p className="text-gray-400 text-sm">Lorem ipsum</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-200"></div>
                  <div>
                    <h3 className="font-semibold">Lorem ipsum</h3>
                    <p className="text-sm text-gray-400">Lorem ipsum</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Start</p>
                  <p className="font-medium">Oct 12</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-100"></div>
                  <div>
                    <h3 className="font-semibold">Lorem ipsum</h3>
                    <p className="text-sm text-gray-400">Lorem ipsum</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Oct 12</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-pink-200"></div>
                  <div>
                    <h3 className="font-semibold">Lorem ipsum</h3>
                    <p className="text-sm text-gray-400">Lorem ipsum</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Oct 12</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-green-200"></div>
                  <div>
                    <h3 className="font-semibold">Lorem ipsum</h3>
                    <p className="text-sm text-gray-400">Lorem ipsum</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Oct 12</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Profile Section */}
        <aside className="w-80 border-l min-h-screen p-6">
          <h2 className="text-4xl font-semibold mb-8">Profile</h2>

          {/* Profile Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-full bg-gray-200 mb-4"></div>
            <h3 className="text-xl font-semibold">Erdene Jargalsaikhan</h3>
          </div>

          {/* Calendar */}
          <div className="mb-8 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md bg-gray-50 p-3"
            />
          </div>

          {/* Progress Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6">Progress</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Session 1</h4>
                  <p className="text-sm text-gray-500">Linear equations in one variable</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Session 2</h4>
                  <p className="text-sm text-gray-500">Text Structure and Purpose</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
