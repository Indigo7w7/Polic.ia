import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      {/* ProfileHeader Skeleton */}
      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] flex flex-row items-center gap-4">
        <div className="w-20 h-20 bg-slate-800 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-8 bg-slate-800 rounded-lg w-1/3" />
          <div className="flex gap-2">
            <div className="h-4 bg-slate-800 rounded-md w-24" />
            <div className="h-4 bg-slate-800 rounded-md w-16" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-6 bg-slate-800 rounded-lg w-20" />
            <div className="h-6 bg-slate-800 rounded-lg w-20" />
          </div>
        </div>
      </div>

      {/* Stats/Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-6">
          <div className="h-48 bg-slate-900/40 border border-slate-800 rounded-[2rem]" />
          <div className="h-64 bg-slate-900/40 border border-slate-800 rounded-[2rem]" />
        </div>
      </div>

      {/* Exam Tracks Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
        <div className="space-y-6">
          <div className="h-8 bg-slate-800 rounded-xl w-48" />
          <div className="h-96 bg-slate-900/40 border border-slate-800 rounded-[2rem]" />
        </div>
        <div className="space-y-6">
          <div className="h-8 bg-slate-800 rounded-xl w-48" />
          <div className="h-96 bg-slate-900/40 border border-slate-800 rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
};
