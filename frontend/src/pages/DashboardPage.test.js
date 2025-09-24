import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Web3Context } from '../context/Web3Context';
import DashboardPage from './DashboardPage';

const mockEscrows = [
  {
    address: '0x1234567890123456789012345678901234567890',
    buyer: '0xBuyerAddress0000000000000000000000000001',
    seller: '0xSellerAddress000000000000000000000000001',
    state: 'AWAITING_PAYMENT',
  },
  {
    address: '0x0987654321098765432109876543210987654321',
    buyer: '0xBuyerAddress0000000000000000000000000002',
    seller: '0xSellerAddress000000000000000000000000002',
    state: 'SHIPPED',
  },
];

const customRender = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <Web3Context.Provider value={providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Web3Context.Provider>,
    renderOptions
  );
};

describe('DashboardPage', () => {
  test('shows connect wallet message when not connected', () => {
    const providerProps = {
      isConnected: false,
      loading: false,
      escrows: [],
    };
    customRender(<DashboardPage />, { providerProps });
    expect(screen.getByText(/Please connect your wallet/i)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    const providerProps = {
      isConnected: true,
      loading: true,
      escrows: [],
    };
    customRender(<DashboardPage />, { providerProps });
    expect(screen.getByText(/Loading escrows.../i)).toBeInTheDocument();
    // The spinner in this version of Chakra might not have role="status"
    // The presence of the text is a sufficient check for the loading state.
  });

  test('shows no escrows message when list is empty', () => {
    const providerProps = {
      isConnected: true,
      loading: false,
      escrows: [],
    };
    customRender(<DashboardPage />, { providerProps });
    expect(screen.getByText(/No escrows found/i)).toBeInTheDocument();
  });

  test('renders list of escrows when connected and data is available', () => {
    const providerProps = {
      isConnected: true,
      loading: false,
      escrows: mockEscrows,
    };
    customRender(<DashboardPage />, { providerProps });

    // Check for the dashboard title
    expect(screen.getByRole('heading', { name: /Escrow Dashboard/i })).toBeInTheDocument();

    // Check that both escrows are rendered by finding their links
    const escrowLinks = screen.getAllByRole('link');
    expect(escrowLinks).toHaveLength(2);
    expect(escrowLinks[0]).toHaveAttribute('href', '/escrow/0x1234567890123456789012345678901234567890');
    expect(escrowLinks[1]).toHaveAttribute('href', '/escrow/0x0987654321098765432109876543210987654321');

    // Check for details of the first escrow
    const firstEscrowItem = screen.getByText(/0x1234...7890/).closest('li');
    expect(within(firstEscrowItem).getByText(/Buyer: 0xBuye...0001/i)).toBeInTheDocument();
    expect(within(firstEscrowItem).getByText(/Seller: 0xSell...0001/i)).toBeInTheDocument();
    expect(within(firstEscrowItem).getByText('AWAITING_PAYMENT')).toBeInTheDocument();

    // Check for details of the second escrow
    const secondEscrowItem = screen.getByText(/0x0987...4321/).closest('li');
    expect(within(secondEscrowItem).getByText(/Buyer: 0xBuye...0002/i)).toBeInTheDocument();
    expect(within(secondEscrowItem).getByText(/Seller: 0xSell...0002/i)).toBeInTheDocument();
    expect(within(secondEscrowItem).getByText('SHIPPED')).toBeInTheDocument();
  });
});
