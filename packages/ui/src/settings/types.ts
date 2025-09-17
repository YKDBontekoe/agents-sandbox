import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: IconDefinition;
}

export type SettingValue = string | number | boolean;

export type SettingType = 'toggle' | 'select' | 'range' | 'preset' | 'number';

interface BaseSettingItem<TType extends SettingType, TValue> {
  id: string;
  name: string;
  description: string;
  type: TType;
  value: TValue;
}

export type ToggleChangeHandler = (value: boolean) => void;
export type NumericChangeHandler = (value: number) => void;
export type SelectChangeHandler<TValue extends SettingValue = SettingValue> = (
  value: TValue,
) => void;

export interface ToggleSettingItem
  extends BaseSettingItem<'toggle', boolean> {
  onChange: ToggleChangeHandler;
}

export interface RangeSettingItem extends BaseSettingItem<'range', number> {
  min: number;
  max: number;
  step?: number;
  onChange: NumericChangeHandler;
}

export interface NumberSettingItem extends BaseSettingItem<'number', number> {
  onChange: NumericChangeHandler;
}

export interface SelectOption<TValue extends SettingValue = SettingValue> {
  value: TValue;
  label: string;
}

export interface SelectSettingItem<
  TValue extends SettingValue = SettingValue,
> extends BaseSettingItem<'select', TValue> {
  options: SelectOption<TValue>[];
  onChange: SelectChangeHandler<TValue>;
}

export interface PresetSettingItem extends BaseSettingItem<'preset', string> {
  options: SelectOption<string>[];
  onChange: SelectChangeHandler<string>;
}

export type SettingItem =
  | ToggleSettingItem
  | RangeSettingItem
  | NumberSettingItem
  | SelectSettingItem
  | PresetSettingItem;

export interface SettingCategory {
  id: string;
  name: string;
  icon: IconDefinition;
  description: string;
  settings: SettingItem[];
}

export interface ToggleSettingConfig {
  value: boolean;
  onChange: ToggleChangeHandler;
}

export interface NumericSettingConfig {
  value: number;
  onChange: NumericChangeHandler;
}

export interface CategoryBuilderContext {
  onAnyChange: () => void;
}

export const isToggleSetting = (
  setting: SettingItem,
): setting is ToggleSettingItem => setting.type === 'toggle';

export const isRangeSetting = (
  setting: SettingItem,
): setting is RangeSettingItem => setting.type === 'range';

export const isNumberSetting = (
  setting: SettingItem,
): setting is NumberSettingItem => setting.type === 'number';

export const isSelectSetting = (
  setting: SettingItem,
): setting is SelectSettingItem => setting.type === 'select';

export const isPresetSetting = (
  setting: SettingItem,
): setting is PresetSettingItem => setting.type === 'preset';
