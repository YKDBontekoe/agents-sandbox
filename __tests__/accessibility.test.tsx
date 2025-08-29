import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import Home from '@/app/page';

it('Home page has no accessibility violations', async () => {
  const { container } = render(<Home />);
  const results = await axe(container, { rules: { 'heading-order': { enabled: false } } });
  expect(results).toHaveNoViolations();
});
