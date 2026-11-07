'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  groups,
  placeholder = 'Search...',
  required = false,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const allOptions = groups
    ? groups.flatMap(g => g.options)
    : (options || []);

  const displayValue = allOptions.find(o => o.value === value)?.label || '';

  const filteredGroups = groups
    ? groups
        .map(g => ({
          ...g,
          options: g.options.filter(o =>
            o.label.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter(g => g.options.length > 0)
    : null;

  const filteredOptions = options
    ? options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  const flatFiltered = filteredGroups
    ? filteredGroups.flatMap(g => g.options)
    : (filteredOptions || []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const scrollToHighlighted = useCallback((index) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-option]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const selectOption = useCallback((optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = highlightedIndex < flatFiltered.length - 1 ? highlightedIndex + 1 : 0;
        setHighlightedIndex(next);
        scrollToHighlighted(next);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = highlightedIndex > 0 ? highlightedIndex - 1 : flatFiltered.length - 1;
        setHighlightedIndex(prev);
        scrollToHighlighted(prev);
        break;
      }
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatFiltered[highlightedIndex]) {
          selectOption(flatFiltered[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const renderOptions = (opts, startIndex) => {
    return opts.map((opt, i) => {
      const globalIndex = startIndex + i;
      const isHighlighted = globalIndex === highlightedIndex;
      const isSelected = opt.value === value;
      return (
        <li
          key={opt.value}
          data-option
          className={`px-3 py-2 cursor-pointer text-sm truncate ${
            isHighlighted ? 'bg-blue-50 text-secondary' : ''
          } ${isSelected ? 'font-semibold text-primary' : 'text-secondary'} hover:bg-gray-100`}
          onMouseDown={(e) => {
            e.preventDefault();
            selectOption(opt.value);
          }}
          onMouseEnter={() => setHighlightedIndex(globalIndex)}
        >
          {opt.label}
        </li>
      );
    });
  };

  let runningIndex = 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={value ? displayValue : placeholder}
          disabled={disabled}
          autoComplete="off"
          className="block w-full px-3 py-2 pr-10 bg-white border border-fourth rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-secondary"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={toggleDropdown}
          disabled={disabled}
          className="absolute right-0 top-0 h-full px-2 flex items-center text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Hidden native input for form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required
          tabIndex={-1}
          className="absolute opacity-0 h-0 w-0 pointer-events-none"
          onChange={() => {}}
        />
      )}

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-fourth rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {flatFiltered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No results found</li>
          ) : filteredGroups ? (
            filteredGroups.map((group) => {
              const groupStartIndex = runningIndex;
              runningIndex += group.options.length;
              return (
                <li key={group.label}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                    {group.label}
                  </div>
                  <ul>{renderOptions(group.options, groupStartIndex)}</ul>
                </li>
              );
            })
          ) : (
            renderOptions(filteredOptions || [], 0)
          )}
        </ul>
      )}
    </div>
  );
}
