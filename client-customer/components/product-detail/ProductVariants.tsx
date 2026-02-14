'use client';

import { Palette, RotateCcw } from 'lucide-react';
import { ProductVariation } from '@/lib/services/api/productService';

interface ProductVariantsProps {
  variations: ProductVariation[];
  selectedVariations: {[key: string]: number};
  onVariationChange: (variationId: string, valueIndex: number) => void;
  onReset: () => void;
  isOptionDisabled?: (variationIndex: number, optionIndex: number) => boolean;
}

export default function ProductVariants({ 
  variations, 
  selectedVariations, 
  onVariationChange,
  onReset,
  isOptionDisabled
}: ProductVariantsProps) {
  if (!variations || variations.length === 0) {
    return null;
  }

  const hasSelections = Object.keys(selectedVariations).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Palette className="h-5 w-5 mr-2 text-blue-600" /> Chọn tùy chọn
        </h3>
        {hasSelections && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 
                       bg-gray-100 hover:bg-gray-200 rounded-md transition-all duration-200
                       border border-gray-200 hover:border-gray-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Chọn lại
          </button>
        )}
      </div>
      
      {variations.map((variation, variationIndex) => {
        const currentSelection = selectedVariations[variationIndex.toString()];

        return (
          <div key={variation._id} className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {variation.variation_name}:
              {currentSelection !== undefined && (
                <span className="ml-2 text-blue-600 font-semibold">
                  {variation.variation_values[currentSelection]}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {variation.variation_values.map((value, valueIndex) => {
                const isSelected = currentSelection === valueIndex;
                const isDisabled = isOptionDisabled ? isOptionDisabled(variationIndex, valueIndex) : false;
                
                return (
                  <button
                    key={valueIndex}
                    onClick={() => !isDisabled && onVariationChange(variationIndex.toString(), valueIndex)}
                    disabled={isDisabled}
                    className={`px-4 py-2 rounded-md border transition-all duration-200 text-sm ${
                      isDisabled
                        ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-md ring-2 ring-blue-200'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:scale-105 cursor-pointer'
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Current Selection Summary */}
      {hasSelections && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Lựa chọn hiện tại:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedVariations).map(([variationIndex, valueIndex]) => {
              const variation = variations[parseInt(variationIndex)];
              if (!variation) return null;
              
              const selectedValue = variation.variation_values[valueIndex];
              return (
                <div key={variationIndex} className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-md border border-blue-300 shadow-sm">
                  <span className="text-sm font-medium text-gray-700">{variation.variation_name}:</span>
                  <span className="text-sm text-blue-700 font-semibold ml-1">{selectedValue}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}