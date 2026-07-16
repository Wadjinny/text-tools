import { memo } from 'react';
import { Trash2, Volume2, VolumeX } from 'lucide-react';
import type { Step } from '../types';

type StepItemProps = {
  step: Step;
  index: number;
  isSelected: boolean;
  dropTargetIndex: number | null;
  editingTitleStepId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  setEditingTitleStepId: (id: string | null) => void;
  onToggleMuted: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
  innerRef?: React.Ref<HTMLDivElement>;
  // Allow other props
  [key: string]: any;
};

export const StepItem = memo(({
  step,
  index,
  isSelected,
  dropTargetIndex,
  editingTitleStepId,
  onSelect,
  onContextMenu,
  onUpdateTitle,
  setEditingTitleStepId,
  onToggleMuted,
  onDelete,
  dragHandleProps,
  style,
  className,
  innerRef,
  ...props
}: StepItemProps) => {
  return (
    <div
      ref={innerRef}
      className={`step-item ${step.muted ? 'is-muted' : ''} ${isSelected ? 'active' : ''} ${dropTargetIndex === index ? 'drop-target' : ''} ${className || ''}`}
      onClick={() => onSelect(step.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, step.id);
      }}
      role="button"
      tabIndex={0}
      style={style}
      {...props}
      {...dragHandleProps}
      onKeyDown={(event) => {
        // Merge our interaction with dnd-kit keyboard handling
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(step.id);
        }
        if (dragHandleProps?.onKeyDown) {
          dragHandleProps.onKeyDown(event);
        }
      }}
    >
      <div className="step-title">
        {editingTitleStepId === step.id ? (
          <input
            autoFocus
            className="step-title-input"
            value={step.title}
            onChange={(e) => onUpdateTitle(step.id, e.target.value)}
            onBlur={() => setEditingTitleStepId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingTitleStepId(null);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span onDoubleClick={() => setEditingTitleStepId(step.id)}>
              {step.title || `title ${index + 1}`}
            </span>
            <span className="step-meta">
              {new Date(step.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </span>
          </div>
        )}
      </div>
      <div className="step-actions">
        <button
          type="button"
          className={`ghost icon-btn ${step.muted ? 'is-active' : ''}`}
          title={step.muted ? 'Unmute step' : 'Mute step'}
          aria-label={step.muted ? 'Unmute step' : 'Mute step'}
          aria-pressed={step.muted}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMuted(step.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {step.muted ? (
            <VolumeX size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="ghost icon-btn danger"
          title="Delete step"
          aria-label="Delete step"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(step.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
