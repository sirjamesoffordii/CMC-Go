import { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
}

export function EditableText({ value, onSave, className = "", inputClassName = "" }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // Sync editValue when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim());
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`border border-blue-500 rounded px-1 outline-none ${inputClassName}`}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-gray-100 rounded px-1 ${className}`}
      title="Click to edit"
    >
      {value}
    </span>
  );
}
