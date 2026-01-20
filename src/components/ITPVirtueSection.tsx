'use client';

import React from 'react';
import { ITPBehavior, ITPVirtue } from '@/types';
import { VIRTUE_CONFIG } from '@/lib/itpBehaviors';
import { ITPBehaviorSlider } from './ITPBehaviorSlider';

interface ITPVirtueSectionProps {
  virtue: ITPVirtue;
  behaviors: ITPBehavior[];
  responses: Record<string, number>;
  onResponseChange: (behaviorKey: string, rating: number) => void;
  disabled?: boolean;
}

export function ITPVirtueSection({
  virtue,
  behaviors,
  responses,
  onResponseChange,
  disabled = false,
}: ITPVirtueSectionProps) {
  const config = VIRTUE_CONFIG[virtue];

  return (
    <div className={`rounded-xl border-2 ${config.borderColor} overflow-hidden shadow-sm`}>
      {/* Section Header */}
      <div 
        className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}
        style={{ 
          background: `linear-gradient(135deg, ${config.bgColor.replace('bg-[', '').replace(']', '')} 0%, white 100%)`
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.accentColor }}
          />
          <h3 className={`text-xl font-semibold ${config.color}`}>
            {config.displayName}
          </h3>
        </div>
      </div>

      {/* Behaviors */}
      <div className="p-5 bg-white">
        {behaviors.map((behavior) => (
          <ITPBehaviorSlider
            key={behavior.behaviorKey}
            behavior={behavior}
            value={responses[behavior.behaviorKey] ?? null}
            onChange={onResponseChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export default ITPVirtueSection;
