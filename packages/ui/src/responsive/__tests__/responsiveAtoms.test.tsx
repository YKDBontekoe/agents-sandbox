import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ResponsivePanel,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveText,
  ResponsiveButton,
  ResponsiveIcon
} from '../index';

describe('responsive atoms', () => {
  it('applies screen size variants for ResponsivePanel', () => {
    const markup = renderToStaticMarkup(
      <ResponsivePanel
        screenSize="mobile"
        variant="compact"
        priority="high"
        collapsible
        isCollapsed
        title="Status"
      >
        <span>Hidden</span>
      </ResponsivePanel>
    );

    expect(markup).toContain('data-variant="compact"');
    expect(markup).toContain('data-priority="high"');
    expect(markup).toContain('p-1.5 text-xs');
    expect(markup).toContain('ring-1 ring-blue-400/30');
    expect(markup).toContain('scale-95 opacity-75');
    expect(markup).toContain('Status');
  });

  it('calculates grid columns and gap responsively', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveGrid screenSize="desktop" columns={{ desktop: 3 }} gap="lg">
        <div />
        <div />
        <div />
      </ResponsiveGrid>
    );

    expect(markup).toContain('grid-cols-3');
    expect(markup).toContain('gap-4');
  });

  it('switches stack direction based on screen size', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveStack
        screenSize="mobile"
        direction={{ mobile: 'horizontal' }}
        gap="sm"
        align="center"
      >
        <span>A</span>
        <span>B</span>
      </ResponsiveStack>
    );

    expect(markup).toContain('flex-row');
    expect(markup).toContain('gap-2');
    expect(markup).toContain('items-center');
  });

  it('applies typography classes responsively', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveText
        screenSize="wide"
        size={{ wide: 'lg' }}
        weight="bold"
        color="success"
      >
        Growth
      </ResponsiveText>
    );

    expect(markup).toContain('text-lg');
    expect(markup).toContain('font-bold');
    expect(markup).toContain('text-green-400');
  });

  it('combines button variants and layout modifiers', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveButton
        screenSize="wide"
        variant="danger"
        size={{ wide: 'md' }}
        disabled
        fullWidth
      >
        Delete
      </ResponsiveButton>
    );

    expect(markup).toContain('bg-red-600');
    expect(markup).toContain('px-4 py-2 text-sm');
    expect(markup).toContain('w-full');
    expect(markup).toContain('opacity-50 cursor-not-allowed');
    expect(markup).toContain('disabled');
  });

  it('renders icon sizing classes', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveIcon screenSize="desktop" size={{ desktop: 'lg' }}>
        <svg />
      </ResponsiveIcon>
    );

    expect(markup).toContain('w-6 h-6');
  });
});
