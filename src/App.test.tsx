import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', async () => {
    render(<App />);
    // Wait for lazy loaded content
    const dashboardElement = await screen.findByText(/Dashboard/i, {}, { timeout: 5000 });
    expect(dashboardElement).toBeInTheDocument();
  });
});
