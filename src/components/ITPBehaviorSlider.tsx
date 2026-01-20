'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ITPBehavior, ITPVirtue } from '@/types';
import { VIRTUE_CONFIG, RATING_LABELS } from '@/lib/itpBehaviors';

interface ITPBehaviorSliderProps {
  behavior: ITPBehavior;
  value: number | null;
  onChange: (behaviorKey: string, rating: number) => void;
  disabled?: boolean;
}

export function ITPBehaviorSlider({
  behavior,
  value,
  onChange,
  disabled = false,
}: ITPBehaviorSliderProps) {
  const [localValue, setLocalValue] = useState<number>(value ?? 1);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== null && !isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const virtueConfig = VIRTUE_CONFIG[behavior.virtue];

  const getPositionFromValue = (val: number): number => {
    return ((val - 1) / 9) * 100;
  };

  const getValueFromPosition = (position: number): number => {
    const rawValue = 1 + (position / 100) * 9;
    return Math.max(1, Math.min(10, rawValue));
  };

  const snapToNearest = (val: number): number => {
    return Math.round(val);
  };

  const handleSliderInteraction = useCallback(
    (clientX: number) => {
      if (disabled || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const position = ((clientX - rect.left) / rect.width) * 100;
      const clampedPosition = Math.max(0, Math.min(100, position));
      const newValue = getValueFromPosition(clampedPosition);
      setLocalValue(newValue);
    },
    [disabled]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleSliderInteraction(e.clientX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleSliderInteraction(e.clientX);
    },
    [isDragging, handleSliderInteraction]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      const snappedValue = snapToNearest(localValue);
      setLocalValue(snappedValue);
      onChange(behavior.behaviorKey, snappedValue);
      setIsDragging(false);
    }
  }, [isDragging, localValue, behavior.behaviorKey, onChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleSliderInteraction(e.touches[0].clientX);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      handleSliderInteraction(e.touches[0].clientX);
    },
    [isDragging, handleSliderInteraction]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      const snappedValue = snapToNearest(localValue);
      setLocalValue(snappedValue);
      onChange(behavior.behaviorKey, snappedValue);
      setIsDragging(false);
    }
  }, [isDragging, localValue, behavior.behaviorKey, onChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleMarkerClick = (markerValue: number) => {
    if (disabled) return;
    setLocalValue(markerValue);
    onChange(behavior.behaviorKey, markerValue);
  };

  const displayValue = isDragging ? localValue : (value ?? 1);
  const thumbPosition = getPositionFromValue(displayValue);

  // Get accent color from virtue config
  const accentColor = virtueConfig.accentColor;

  return (
    <div className={`p-5 rounded-xl border ${virtueConfig.borderColor} ${virtueConfig.bgColor} mb-4 transition-all duration-200 hover:shadow-sm`}>
      <h4 className={`font-semibold text-base mb-4 ${virtueConfig.color}`}>
        {behavior.behaviorName}
      </h4>

      {/* Description Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
        <div className="p-3 bg-white/70 rounded-lg border border-neutral-200/60">
          <div className="font-medium text-red-600 mb-1.5">Not Living</div>
          <p className="text-neutral-600 leading-relaxed">{behavior.descriptionNotLiving}</p>
        </div>
        <div className="p-3 bg-white/70 rounded-lg border border-neutral-200/60">
          <div className="font-medium text-amber-600 mb-1.5">Living</div>
          <p className="text-neutral-600 leading-relaxed">{behavior.descriptionLiving}</p>
        </div>
        <div className="p-3 bg-white/70 rounded-lg border border-neutral-200/60">
          <div className="font-medium text-emerald-600 mb-1.5">Role Modeling</div>
          <p className="text-neutral-600 leading-relaxed">{behavior.descriptionRoleModeling}</p>
        </div>
      </div>

      {/* Slider */}
      <div className="px-2">
        <div
          ref={sliderRef}
          className={`relative h-8 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Track Background */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-neutral-200 rounded-full">
            {/* Active Track */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ 
                width: `${thumbPosition}%`,
                backgroundColor: accentColor,
                transitionDuration: isDragging ? '0ms' : '150ms'
              }}
            />
          </div>

          {/* Markers */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((markerValue) => {
            const markerPosition = getPositionFromValue(markerValue);
            const isActive = displayValue >= markerValue;
            const isSnapped = Math.round(displayValue) === markerValue;

            return (
              <button
                key={markerValue}
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClick(markerValue);
                }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 transition-all duration-150 ${
                  disabled ? '' : 'hover:scale-110'
                }`}
                style={{ 
                  left: `${markerPosition}%`,
                  backgroundColor: isSnapped || isActive ? accentColor : 'white',
                  borderColor: isSnapped || isActive ? 'white' : '#D1D5DB',
                  transform: `translate(-50%, -50%) scale(${isSnapped ? 1.25 : 1})`,
                  boxShadow: isSnapped ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
                aria-label={`Rate ${markerValue}`}
              />
            );
          })}

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-lg transition-all"
            style={{ 
              left: `${thumbPosition}%`,
              backgroundColor: accentColor,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.25 : 1})`,
              transitionDuration: isDragging ? '0ms' : '150ms'
            }}
          />
        </div>

        {/* Scale Labels - positioned to match nodes exactly */}
        <div className="relative mt-2 text-xs text-neutral-500 font-medium h-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <span
              key={num}
              className="absolute -translate-x-1/2"
              style={{ left: `${((num - 1) / 9) * 100}%` }}
            >
              {num}
            </span>
          ))}
        </div>
        <div className="relative mt-1 text-xs h-4">
          <span className="absolute left-0 text-red-600 font-medium">Not Living</span>
          <span className="absolute text-amber-600 font-medium" style={{ left: `${((7 - 1) / 9) * 100}%`, transform: 'translateX(-50%)' }}>Living</span>
          <span className="absolute right-0 text-emerald-600 font-medium">Role Modeling</span>
        </div>
      </div>
    </div>
  );
}

export default ITPBehaviorSlider;
