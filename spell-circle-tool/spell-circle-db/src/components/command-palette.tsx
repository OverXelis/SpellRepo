'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSpellStore } from '@/lib/store';
import { generateSpellName } from '@/lib/spell-name-generator';
import { 
  Search, 
  Star, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Settings2,
  Scroll,
  Sparkles,
  Command
} from 'lucide-react';

interface CommandItem {
  id: string;
  type: 'spell' | 'action' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  onNavigateToFavorites?: () => void;
  onNavigateToDuds?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onClearAll?: () => void;
  onOpenNamingConfig?: () => void;
}

export function CommandPalette({
  onNavigateToFavorites,
  onNavigateToDuds,
  onExport,
  onImport,
  onClearAll,
  onOpenNamingConfig,
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { spells, runeNameConfig } = useSpellStore();

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Actions
    items.push({
      id: 'action-favorites',
      type: 'navigation',
      title: 'Show Favorites',
      subtitle: 'Filter to show only favorited spells',
      icon: <Star className="w-4 h-4 text-yellow-400" />,
      action: () => {
        onNavigateToFavorites?.();
        setIsOpen(false);
      },
      keywords: ['favorites', 'starred', 'best'],
    });

    items.push({
      id: 'action-duds',
      type: 'navigation',
      title: 'Show Duds',
      subtitle: 'Filter to show marked dud spells',
      icon: <Trash2 className="w-4 h-4 text-red-400" />,
      action: () => {
        onNavigateToDuds?.();
        setIsOpen(false);
      },
      keywords: ['duds', 'bad', 'failed'],
    });

    items.push({
      id: 'action-export',
      type: 'action',
      title: 'Export Database',
      subtitle: 'Download your spell database as JSON',
      icon: <Download className="w-4 h-4 text-arcane-400" />,
      action: () => {
        onExport?.();
        setIsOpen(false);
      },
      keywords: ['export', 'download', 'backup', 'save'],
    });

    items.push({
      id: 'action-import',
      type: 'action',
      title: 'Import Database',
      subtitle: 'Load a spell database from file',
      icon: <Upload className="w-4 h-4 text-arcane-400" />,
      action: () => {
        onImport?.();
        setIsOpen(false);
      },
      keywords: ['import', 'upload', 'load', 'restore'],
    });

    items.push({
      id: 'action-naming',
      type: 'action',
      title: 'Configure Spell Names',
      subtitle: 'Set up display names for runes',
      icon: <Settings2 className="w-4 h-4 text-mystic-400" />,
      action: () => {
        onOpenNamingConfig?.();
        setIsOpen(false);
      },
      keywords: ['naming', 'configure', 'settings', 'names'],
    });

    items.push({
      id: 'action-clear',
      type: 'action',
      title: 'Clear All Spells',
      subtitle: 'Remove all spells from database',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: () => {
        onClearAll?.();
        setIsOpen(false);
      },
      keywords: ['clear', 'delete', 'remove', 'reset'],
    });

    // Add spells (limit to prevent performance issues)
    const spellItems = spells.slice(0, 100).map((spell): CommandItem => ({
      id: `spell-${spell.id}`,
      type: 'spell',
      title: generateSpellName(spell, runeNameConfig),
      subtitle: `${spell.circleBase} • ${spell.primaryRune}`,
      icon: spell.status === 'favorite' 
        ? <Star className="w-4 h-4 text-yellow-400 fill-current" />
        : <Scroll className="w-4 h-4 text-slate-400" />,
      action: () => {
        // Could scroll to spell or select it
        setIsOpen(false);
      },
      keywords: [spell.circleBase, spell.primaryRune, ...spell.modifierRunes, spell.controlRune || ''].filter(Boolean),
    }));

    return [...items, ...spellItems];
  }, [spells, runeNameConfig, onNavigateToFavorites, onNavigateToDuds, onExport, onImport, onClearAll, onOpenNamingConfig]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      return commands.filter(c => c.type !== 'spell').slice(0, 10);
    }

    const searchLower = search.toLowerCase();
    return commands
      .filter((cmd) => {
        const titleMatch = cmd.title.toLowerCase().includes(searchLower);
        const subtitleMatch = cmd.subtitle?.toLowerCase().includes(searchLower);
        const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower));
        return titleMatch || subtitleMatch || keywordMatch;
      })
      .slice(0, 15);
  }, [commands, search]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open palette with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle keyboard navigation in palette
  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div 
        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[85] w-full max-w-xl"
        onKeyDown={handlePaletteKeyDown}
      >
        <div 
          className="glass-dark rounded-xl border border-dark-500/50 shadow-2xl overflow-hidden"
          style={{
            boxShadow: `
              0 25px 80px rgba(0, 0, 0, 0.6),
              0 0 60px rgba(0, 149, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
          }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-600/50">
            <Search className="w-5 h-5 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spells, actions..."
              className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 outline-none font-philosopher"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-slate-500 bg-dark-700 rounded border border-dark-600">
              <Command className="w-3 h-3" />K
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-philosopher">No results found</p>
              </div>
            ) : (
              filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  data-index={index}
                  onClick={cmd.action}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-arcane-600/20 border-l-2 border-arcane-500'
                      : 'hover:bg-dark-700/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      index === selectedIndex ? 'text-slate-100' : 'text-slate-300'
                    }`}>
                      {cmd.title}
                    </p>
                    {cmd.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{cmd.subtitle}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    cmd.type === 'spell' 
                      ? 'bg-arcane-900/50 text-arcane-300'
                      : cmd.type === 'action'
                      ? 'bg-mystic-900/50 text-mystic-300'
                      : 'bg-emerald-900/50 text-emerald-300'
                  }`}>
                    {cmd.type}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-dark-600/50 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-700 rounded">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-700 rounded">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-700 rounded">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}




