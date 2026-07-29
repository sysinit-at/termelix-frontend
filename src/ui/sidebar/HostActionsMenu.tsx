import React from "react";
import { useTranslation } from "react-i18next";
import { MoreVertical } from "lucide-react";

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import type { Host } from "@/types/ui-types";
import { hostActions, type HostActionHandlers } from "./host-actions";

/** Right-click anywhere on the row. */
export function HostActionsMenu({
  host,
  ...handlers
}: { host: Host } & HostActionHandlers) {
  const { t } = useTranslation();

  return (
    <ContextMenuContent>
      <ContextMenuLabel className="truncate">{host.name}</ContextMenuLabel>
      <ContextMenuSeparator />
      {hostActions(host, handlers, t).map((action) =>
        action.kind === "separator" ? (
          <ContextMenuSeparator key={action.id} />
        ) : (
          <ContextMenuItem
            key={action.id}
            variant={action.destructive ? "destructive" : "default"}
            onSelect={action.onSelect}
          >
            <action.icon />
            {action.label}
          </ContextMenuItem>
        ),
      )}
    </ContextMenuContent>
  );
}

/**
 * The same actions, behind a button on the row.
 *
 * Right-click alone was the whole story for a while, and nothing on screen said so — actions
 * that are reachable and invisible are, for anyone who was not told, absent. The button is
 * always rendered rather than appearing on hover, so it costs no layout shift and can be reached
 * by keyboard; it just gets quieter when the pointer is elsewhere.
 */
export function HostActionsButton({
  host,
  onOpenChange,
  ...handlers
}: {
  host: Host;
  onOpenChange?: (open: boolean) => void;
} & HostActionHandlers) {
  const { t } = useTranslation();

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("hosts.actionsFor", { name: host.name })}
          title={t("hosts.actionsMenu")}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground/50 opacity-70 transition-opacity hover:bg-muted-foreground/10 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <MoreVertical className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="truncate">{host.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hostActions(host, handlers, t).map((action) =>
          action.kind === "separator" ? (
            <DropdownMenuSeparator key={action.id} />
          ) : (
            <DropdownMenuItem
              key={action.id}
              variant={action.destructive ? "destructive" : "default"}
              onSelect={action.onSelect}
            >
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
