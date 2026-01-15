import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

export function SearchableCombobox(props: {
  value: string | null | undefined;
  valueLabel?: string;
  options: ComboboxOption[];
  onChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  noneLabel?: string;
  disabled?: boolean;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
}) {
  const {
    value,
    valueLabel,
    options,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyText,
    noneLabel,
    disabled,
    searchValue,
    onSearchValueChange,
  } = props;

  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    if (value == null) return null;
    return options.find((o) => o.value === value) ?? null;
  }, [options, value]);

  const buttonText = useMemo(() => {
    if (value === undefined) return placeholder;
    if (value === null) return noneLabel ?? "None";
    return selected?.label ?? valueLabel ?? placeholder;
  }, [noneLabel, placeholder, selected?.label, value, valueLabel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className={cn("truncate", value === undefined && "text-muted-foreground")}>
            {buttonText}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder ?? "Search..."}
            value={searchValue}
            onValueChange={onSearchValueChange}
          />
          <CommandList>
            <CommandEmpty>{emptyText ?? "No results found"}</CommandEmpty>
            <CommandGroup>
              {noneLabel ? (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                  {noneLabel}
                </CommandItem>
              ) : null}

              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.description ? (
                      <div className="truncate text-xs text-muted-foreground">{option.description}</div>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
