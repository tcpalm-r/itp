'use client';

import { ITPBehavior } from '@/types';
import { RATING_LABELS } from '@/lib/itpBehaviors';

interface ITPBehaviorSliderProps {
  behavior: ITPBehavior;
  value: number | null;
  onChange: (behaviorKey: string, rating: number) => void;
  disabled?: boolean;
}

export default function ITPBehaviorSlider({
  behavior,
  value,
  onChange,
  disabled = false,
}: ITPBehaviorSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rating = Math.round(parseFloat(e.target.value));
    onChange(behavior.behaviorKey, rating);
  };

  const handleDotClick = (rating: number) => {
    if (!disabled) {
      onChange(behavior.behaviorKey, rating);
    }
  };

  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <h4 className="font-medium text-gray-900 mb-3">{behavior.behaviorName}</h4>

      {/* Three column descriptions */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
        <div className="text-left">
          <div className="font-medium text-red-600 mb-1">Not Living (1)</div>
          <p className="text-gray-600 leading-relaxed">
            {behavior.descriptionNotLiving}
          </p>
        </div>
        <div className="text-center">
          <div className="font-medium text-yellow-600 mb-1">Living (3)</div>
          <p className="text-gray-600 leading-relaxed">
            {behavior.descriptionLiving}
          </p>
        </div>
        <div className="text-right">
          <div className="font-medium text-green-600 mb-1">Role Modeling (5)</div>
          <p className="text-gray-600 leading-relaxed">
            {behavior.descriptionRoleModeling}
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-2">
        {/* Track background */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full -translate-y-1/2" />

        {/* Progress fill */}
        {value && (
          <div
            className="absolute top-1/2 left-0 h-2 bg-blue-500 rounded-full -translate-y-1/2 transition-all"
            style={{ width: `${((value - 1) / 4) * 100}%` }}
          />
        )}

        {/* Clickable dots */}
        <div className="relative flex justify-between px-0">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleDotClick(rating)}
              disabled={disabled}
              className={`w-6 h-6 rounded-full border-2 transition-all z-10 ${
                value === rating
                  ? 'bg-blue-500 border-blue-500 scale-110'
                  : value && value > rating
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-blue-400'
              } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              title={RATING_LABELS[rating] || `Rating ${rating}`}
            >
              <span className="sr-only">Rating {rating}</span>
            </button>
          ))}
        </div>

        {/* Hidden range input for accessibility */}
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value || 3}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={`Rate ${behavior.behaviorName}`}
        />
      </div>

      {/* Rating labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>

      {/* Current value indicator */}
      {value && (
        <div className="text-center mt-2">
          <span className="text-sm font-medium text-blue-600">
            Current: {value} {RATING_LABELS[value] && `(${RATING_LABELS[value]})`}
          </span>
        </div>
      )}
    </div>
  );
}
