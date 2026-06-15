import { motion } from 'motion/react';
import { QUEUE_CATEGORIES, QueueCategory } from '../lib/categories';

interface CategoryChipsProps {
  categories: QueueCategory[];
  selected: QueueCategory;
  onSelect: (category: QueueCategory) => void;
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const chips = categories.includes('All') ? categories : (['All', ...categories] as QueueCategory[]);

  return (
    <div className="chip-scroll -mx-1 px-1">
      {chips.map((cat) => {
        const active = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`category-chip ${active ? 'category-chip-active' : ''}`}
          >
            {active && (
              <motion.span
                layoutId="category-chip-bg"
                className="category-chip-bg"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{cat}</span>
          </button>
        );
      })}
    </div>
  );
}

export { QUEUE_CATEGORIES };
