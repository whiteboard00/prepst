"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TodoSection as TodoSectionType } from "./types";
import { TodoItem } from "./todo-item";

interface TodoSectionProps {
  section: TodoSectionType;
  onToggleTodo: (todoId: string) => void;
  isDraggedOver: boolean;
}

export function TodoSection({
  section,
  onToggleTodo,
  isDraggedOver,
}: TodoSectionProps) {
  const { setNodeRef } = useDroppable({
    id: section.id,
  });

  const isMockSection = section.id === "mock-1" || section.id === "mock-2";
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-colors ${
        isMockSection 
          ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50" 
          : "bg-card border-border"
      } ${isDraggedOver ? "border-primary bg-accent/50" : ""}`}
      style={{ boxShadow: "5px 4px 30px 3px rgba(128, 128, 128, 0.2)" }}
    >
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <span className="text-xl">{section.icon}</span>
        <h2 className="text-foreground text-sm font-semibold">
          {section.title}
        </h2>
        <span className="text-muted-foreground ml-auto text-xs">
          {section.todos.length}
        </span>
      </div>
      <div className="p-2">
        <SortableContext
          items={section.todos.map((todo) => todo.id)}
          strategy={verticalListSortingStrategy}
        >
          {section.todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => onToggleTodo(todo.id)}
            />
          ))}
        </SortableContext>
        {section.todos.length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {section.id.startsWith("mock") ? (
              <div className="space-y-2">
                <div className="text-4xl">🎯</div>
                <div className="font-medium">Mock Test Coming Soon</div>
                <div className="text-xs">Complete your practice sessions to unlock</div>
              </div>
            ) : (
              "No sessions in this section"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
