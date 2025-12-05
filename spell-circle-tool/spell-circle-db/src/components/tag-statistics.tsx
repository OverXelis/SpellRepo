'use client';

import { useState, useMemo } from 'react';
import { useSpellStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ChevronUp, BarChart3, Tag, Star } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export function TagStatistics() {
  const [isOpen, setIsOpen] = useState(false);
  const { spells, availableTags } = useSpellStore();

  const stats = useMemo(() => {
    const tagCounts: Record<string, { total: number; favorites: number }> = {};
    let untaggedCount = 0;
    let untaggedFavorites = 0;
    let totalFavorites = 0;

    // Initialize all tags with 0
    availableTags.forEach(tag => {
      tagCounts[tag] = { total: 0, favorites: 0 };
    });

    // Count spells per tag and favorites
    spells.forEach(spell => {
      const isFavorite = spell.status === 'favorite';
      if (isFavorite) totalFavorites++;

      if (spell.tags.length === 0) {
        untaggedCount++;
        if (isFavorite) untaggedFavorites++;
      } else {
        spell.tags.forEach(tag => {
          if (tagCounts[tag] !== undefined) {
            tagCounts[tag].total++;
            if (isFavorite) tagCounts[tag].favorites++;
          }
        });
      }
    });

    // Calculate percentages and sort by count
    const totalSpells = spells.length;
    const tagStats = availableTags.map(tag => ({
      tag,
      count: tagCounts[tag].total,
      favorites: tagCounts[tag].favorites,
      percentage: totalSpells > 0 ? (tagCounts[tag].total / totalSpells) * 100 : 0,
      favoritePercentage: tagCounts[tag].total > 0 
        ? (tagCounts[tag].favorites / tagCounts[tag].total) * 100 
        : 0,
    })).sort((a, b) => b.count - a.count);

    return {
      totalSpells,
      totalFavorites,
      untaggedCount,
      untaggedFavorites,
      untaggedPercentage: totalSpells > 0 ? (untaggedCount / totalSpells) * 100 : 0,
      untaggedFavoritePercentage: untaggedCount > 0 ? (untaggedFavorites / untaggedCount) * 100 : 0,
      tagStats,
    };
  }, [spells, availableTags]);

  // Color palette for progress bars (these will be the "base" colors, with gold overlay for favorites)
  const getBarColor = (index: number): string => {
    const colors = [
      'bg-arcane-500',
      'bg-mystic-500', 
      'bg-emerald-500',
      'bg-rose-500',
      'bg-sky-500',
      'bg-violet-500',
      'bg-orange-500',
      'bg-teal-500',
    ];
    return colors[index % colors.length];
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full group"
      >
        <BarChart3 className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
        Spell Statistics
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-dark-500/50 bg-dark-800/90 p-5 shadow-xl backdrop-blur-sm section-animate spellbook-page card-depth">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-philosopher font-semibold text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-arcane-400" />
          Spell Statistics
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

      {/* Total spells count */}
      <div className="mb-4 p-3 rounded-lg bg-dark-700/50 border border-dark-600/50">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm font-philosopher">Total Spells</span>
          <div className="flex items-center gap-3">
            <AnimatedCounter 
              value={stats.totalSpells} 
              className="text-2xl font-cinzel font-bold text-arcane-400"
            />
            {stats.totalFavorites > 0 && (
              <span className="flex items-center gap-1 text-sm text-yellow-400">
                <Star className="h-3 w-3 fill-current" />
                <AnimatedCounter value={stats.totalFavorites} />
              </span>
            )}
          </div>
        </div>
      </div>

      {stats.totalSpells === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-4">
          Add some spells to see statistics
        </p>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm bg-arcane-500" />
              <span>Regular</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm bg-yellow-400" />
              <Star className="h-2.5 w-2.5 text-yellow-400" />
              <span>Favorites</span>
            </div>
          </div>

          {/* Tag breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-3 w-3 text-slate-500" />
              <span className="text-xs text-slate-500 font-philosopher">Tag Distribution</span>
            </div>
            
            {stats.tagStats.map((stat, index) => (
              <div key={stat.tag} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{stat.tag}</span>
                  <span className="text-slate-400">
                    {stat.count}
                    {stat.favorites > 0 && (
                      <span className="text-yellow-400 ml-1">
                        (<Star className="h-2.5 w-2.5 inline fill-current" /> {stat.favorites})
                      </span>
                    )}
                    <span className="text-slate-500 ml-1">({stat.percentage.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-2.5 bg-dark-700 rounded-full overflow-hidden relative">
                  {/* Base bar (full width of percentage) */}
                  <div 
                    className={`absolute inset-y-0 left-0 ${getBarColor(index)} transition-all duration-500 ease-out rounded-full`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                  {/* Golden favorites overlay (percentage of the bar that's favorites) */}
                  {stat.favorites > 0 && (
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500 ease-out rounded-full"
                      style={{ 
                        width: `${(stat.favorites / stats.totalSpells) * 100}%`,
                      }}
                      title={`${stat.favorites} favorites`}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Untagged spells */}
            <div className="space-y-1 pt-2 border-t border-dark-600/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 italic">Untagged</span>
                <span className="text-slate-400">
                  {stats.untaggedCount}
                  {stats.untaggedFavorites > 0 && (
                    <span className="text-yellow-400 ml-1">
                      (<Star className="h-2.5 w-2.5 inline fill-current" /> {stats.untaggedFavorites})
                    </span>
                  )}
                  <span className="text-slate-500 ml-1">({stats.untaggedPercentage.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-2.5 bg-dark-700 rounded-full overflow-hidden relative">
                {/* Base bar */}
                <div 
                  className="absolute inset-y-0 left-0 bg-slate-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${stats.untaggedPercentage}%` }}
                />
                {/* Golden favorites overlay */}
                {stats.untaggedFavorites > 0 && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500 ease-out rounded-full"
                    style={{ 
                      width: `${(stats.untaggedFavorites / stats.totalSpells) * 100}%`,
                    }}
                    title={`${stats.untaggedFavorites} favorites`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Quick insights */}
          {stats.tagStats.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-600/50">
              <p className="text-xs text-slate-500 font-philosopher">
                {stats.tagStats[0]?.count > 0 && (
                  <>
                    <span className="text-arcane-400">{stats.tagStats[0].tag}</span> is your most common tag
                    {stats.tagStats[0].favorites > 0 && (
                      <span className="text-yellow-400">
                        {' '}with {stats.tagStats[0].favorites} favorite{stats.tagStats[0].favorites > 1 ? 's' : ''}
                      </span>
                    )}
                    {stats.tagStats[stats.tagStats.length - 1]?.count === 0 && stats.tagStats.length > 1 && (
                      <>, while <span className="text-slate-400">{stats.tagStats[stats.tagStats.length - 1].tag}</span> has no spells yet</>
                    )}
                    .
                  </>
                )}
                {stats.untaggedCount > stats.totalSpells / 2 && (
                  <span className="text-gold-400 ml-1">
                    Consider tagging more spells for better organization!
                  </span>
                )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
