import { render, screen, fireEvent, waitFor } from '../../test-utils/test-utils';
import { mockWeb3Context } from '../../test-utils/mocks';
import EscrowDetailPage from './EscrowDetailPage';
import { jest } from '@jest/globals';

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    address: '0xMockEscrowAddress',
  }),
}));

describe('EscrowDetailPage Component', () => {
  it('renders loading state initially', () => {
    render(<EscrowDetailPage />);
    expect(screen.getByText(/loading escrow details.../i)).toBeInTheDocument();
  });

  it('renders escrow details and deposit form for buyer in AWAITING_PAYMENT state', async () => {
    render(<EscrowDetailPage />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading escrow details.../i)).not.toBeInTheDocument();
    });

    // Check for details
    expect(screen.getByText('Escrow Details')).toBeInTheDocument();
    expect(screen.getByText('0xMockEscrowAddress')).toBeInTheDocument();
    expect(screen.getByText(/awaiting payment/i)).toBeInTheDocument();

    // Check for buyer actions
    expect(screen.getByPlaceholderText('Amount in ETH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deposit funds/i })).toBeInTheDocument();
  });

  it('shows an error for invalid deposit amount', async () => {
    render(<EscrowDetailPage />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const depositInput = screen.getByPlaceholderText('Amount in ETH');
    const depositButton = screen.getByRole('button', { name: /deposit funds/i });

    fireEvent.change(depositInput, { target: { value: 'not-a-number' } });
    fireEvent.click(depositButton);

    expect(await screen.findByText('Invalid ETH amount format.')).toBeInTheDocument();
  });

  it('shows an error for zero or negative deposit amount', async () => {
    render(<EscrowDetailPage />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const depositInput = screen.getByPlaceholderText('Amount in ETH');
    const depositButton = screen.getByRole('button', { name: /deposit funds/i });

    fireEvent.change(depositInput, { target: { value: '-1' } });
    fireEvent.click(depositButton);

    expect(await screen.findByText('Please enter a valid positive number.')).toBeInTheDocument();
  });

  it('calls sendTransaction on successful deposit', async () => {
    const mockSigner = {
      sendTransaction: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue(true), // Mock the wait function
      }),
    };

    const customProviderProps = {
      ...mockWeb3Context,
      signer: mockSigner,
    };

    render(<EscrowDetailPage />, { providerProps: customProviderProps });
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const depositInput = screen.getByPlaceholderText('Amount in ETH');
    const depositButton = screen.getByRole('button', { name: /deposit funds/i });

    fireEvent.change(depositInput, { target: { value: '0.5' } });
    fireEvent.click(depositButton);

    await waitFor(() => {
      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: '0xMockEscrowAddress',
        value: expect.anything(), // or ethers.parseEther('0.5')
      });
    });
  });

  it('shows correct actions for seller in AWAITING_DELIVERY state', async () => {
    // Mock the context to return a different state and user role
    const customProviderProps = {
      ...mockWeb3Context,
      account: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // The seller
      getEscrowContract: jest.fn(() => ({
        ...mockWeb3Context.getEscrowContract(),
        getState: jest.fn().mockResolvedValue('AWAITING_DELIVERY'),
      })),
    };

    render(<EscrowDetailPage />, { providerProps: customProviderProps });
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: /confirm shipment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /raise dispute/i })).toBeInTheDocument();
  });
});
