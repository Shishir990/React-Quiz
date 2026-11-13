import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui';

// "⋮" menu on each card
export function CardMenu({ category, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="ad-menu" ref={ref}>
      <button
        className="ad-icon-btn ad-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${category.name}`}
      >
        <Icon name="more" size={16} />
      </button>
      {open && (
        <div className="ad-dropdown ad-menu-list" role="menu">
          <button className="ad-dropdown-item" role="menuitem" onClick={pick(onEdit)}>
            <Icon name="edit" size={15} /> Edit category
          </button>
          <Link className="ad-dropdown-item" role="menuitem" to={`/admin/questions/category?id=${category._id}`}>
            <Icon name="quizzes" size={15} /> Open questions
          </Link>
          <button className="ad-dropdown-item is-danger" role="menuitem" onClick={pick(onDelete)}>
            <Icon name="trash" size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
