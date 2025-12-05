'use client';

import { useState } from 'react';
import { useSpellStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllModifierPairKeys, parseModifierPairKey } from '@/lib/spell-name-generator';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';

export function NamingConfig() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'primary' | 'modifier' | 'pairs' | 'control'>('primary');
  
  const {
    runeLists,
    runeNameConfig,
    updatePrimaryName,
    updateModifierName,
    updateModifierPairName,
    updateControlName,
  } = useSpellStore();

  const modifierPairs = getAllModifierPairKeys(runeLists.modifierRunes);

  const handlePrimaryChange = (rune: string, value: string) => {
    updatePrimaryName(rune, value);
  };

  const handleModifierChange = (rune: string, value: string) => {
    updateModifierName(rune, value);
  };

  const handlePairChange = (pairKey: string, value: string) => {
    updateModifierPairName(pairKey, value);
  };

  const handleControlChange = (rune: string, value: string) => {
    updateControlName(rune, value);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full group"
      >
        <Settings2 className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
        Configure Spell Names
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-dark-500/50 bg-dark-800/90 p-5 shadow-xl backdrop-blur-sm section-animate spellbook-page card-depth">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-philosopher font-semibold text-slate-100 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-mystic-400" />
          Spell Naming Configuration
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0 hover:text-arcane-400"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-slate-400 mb-4 font-philosopher italic">
        Set display names for runes to generate spell names like "Empowered Fireball (Channeled)"
      </p>

      {/* Section Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {[
          { key: 'primary', label: 'Primary', count: runeLists.primaryRunes.length },
          { key: 'modifier', label: 'Modifier', count: runeLists.modifierRunes.length },
          { key: 'pairs', label: 'Pairs', count: modifierPairs.length },
          { key: 'control', label: 'Control', count: runeLists.controlRunes.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as typeof activeSection)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeSection === key
                ? 'bg-arcane-600 text-white'
                : 'bg-dark-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Primary Names */}
      {activeSection === 'primary' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Set noun forms for primary runes (e.g., "Fire" → "Fireball")
          </p>
          {runeLists.primaryRunes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No primary runes yet</p>
          ) : (
            runeLists.primaryRunes.map((rune) => (
              <div key={rune} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-24 truncate" title={rune}>
                  {rune}
                </span>
                <span className="text-slate-600">→</span>
                <Input
                  value={runeNameConfig.primaryNames[rune] || ''}
                  onChange={(e) => handlePrimaryChange(rune, e.target.value)}
                  placeholder={rune}
                  className="h-8 text-sm flex-1"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Modifier Names */}
      {activeSection === 'modifier' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Set adjective forms for modifiers (e.g., "Empower" → "Empowered")
          </p>
          {runeLists.modifierRunes.map((rune) => (
            <div key={rune} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 truncate" title={rune}>
                {rune}
              </span>
              <span className="text-slate-600">→</span>
              <Input
                value={runeNameConfig.modifierNames[rune] || ''}
                onChange={(e) => handleModifierChange(rune, e.target.value)}
                placeholder={rune}
                className="h-8 text-sm flex-1"
              />
            </div>
          ))}
        </div>
      )}

      {/* Modifier Pair Names */}
      {activeSection === 'pairs' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Set combined names for modifier pairs (e.g., "Empower + Extend" → "Overwhelming")
          </p>
          {modifierPairs.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Add at least 2 modifiers to create pairs
            </p>
          ) : (
            modifierPairs.map((pairKey) => {
              const [mod1, mod2] = parseModifierPairKey(pairKey);
              return (
                <div key={pairKey} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-32 truncate" title={`${mod1} + ${mod2}`}>
                    {mod1} + {mod2}
                  </span>
                  <span className="text-slate-600">→</span>
                  <Input
                    value={runeNameConfig.modifierPairNames[pairKey] || ''}
                    onChange={(e) => handlePairChange(pairKey, e.target.value)}
                    placeholder={`${mod1} ${mod2}`}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Control Names */}
      {activeSection === 'control' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Set verb/descriptor forms for controls (e.g., "Channeling" → "Channeled")
          </p>
          {runeLists.controlRunes.map((rune) => (
            <div key={rune} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 truncate" title={rune}>
                {rune}
              </span>
              <span className="text-slate-600">→</span>
              <Input
                value={runeNameConfig.controlNames[rune] || ''}
                onChange={(e) => handleControlChange(rune, e.target.value)}
                placeholder={rune}
                className="h-8 text-sm flex-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

