import { memo, useEffect, useRef, useState } from 'react';
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
  onUpdateTitle: (id: string, title: string) => boolean;
  setEditingTitleStepId: (id: string | null) => void;
  onToggleMuted: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
  style?: React.CSSProperties;
  className?: string;
  innerRef?: React.Ref<HTMLDivElement>;
  [key: string]: unknown;
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
  const isEditing = editingTitleStepId === step.id;
  const [draftTitle, setDraftTitle] = useState(step.title);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      setDraftTitle(step.title);
    }
  }, [isEditing, step.id, step.title]);

  const commitTitle = () => {
    if (!isEditing) return;
    if (onUpdateTitle(step.id, draftTitle)) {
      setEditingTitleStepId(null);
    }
  };

  const cancelTitle = () => {
    skipBlurCommitRef.current = true;
    setDraftTitle(step.title);
    setEditingTitleStepId(null);
  };

  return (
    <div
      ref={innerRef}
      className={`step-item ${step.muted ? 'is-muted' : ''} ${isSelected ? 'active' : ''} ${dropTargetIndex === index ? 'drop-target' : ''} ${isEditing ? 'is-editing' : ''} ${className || ''}`}
      onClick={() => onSelect(step.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, step.id);
      }}
      role="button"
      tabIndex={0}
      style={style}
      {...props}
      {...(isEditing ? {} : dragHandleProps)}
      onKeyDown={(event) => {
        if (isEditing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(step.id);
        }
        const handleKeyDown = dragHandleProps?.onKeyDown;
        if (typeof handleKeyDown === 'function') {
          handleKeyDown(event);
        }
      }}
    >
      <div className="step-title">
        {isEditing ? (
          <input
            autoFocus
            className="step-title-input"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => {
              if (skipBlurCommitRef.current) {
                skipBlurCommitRef.current = false;
                return;
              }
              commitTitle();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                commitTitle();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancelTitle();
              } else {
                e.stopPropagation();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="step-title-text"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingTitleStepId(step.id);
            }}
          >
            {step.title || `title ${index + 1}`}
          </span>
        )}
      </div>
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
            <VolumeX size={14} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Volume2 size={14} strokeWidth={1.75} aria-hidden="true" />
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
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
