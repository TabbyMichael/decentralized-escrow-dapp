import { render, screen, fireEvent, waitFor } from '../../test-utils/test-utils';
import { mockWeb3Context } from '../../test-utils/mocks';
import CreateEscrow from './CreateEscrow';

describe('CreateEscrow Component', () => {
  it('renders the create button and opens the modal on click', () => {
    render(<CreateEscrow />);

    // Check if the button is there
    const createButton = screen.getByRole('button', { name: /create new escrow/i });
    expect(createButton).toBeInTheDocument();

    // Click the button to open the modal
    fireEvent.click(createButton);

    // Check if the modal header is visible
    expect(screen.getByText('Create a New Escrow')).toBeInTheDocument();
  });

  it('shows an error message for an invalid seller address', async () => {
    render(<CreateEscrow />);
    fireEvent.click(screen.getByRole('button', { name: /create new escrow/i }));

    const sellerInput = screen.getByLabelText(/seller address/i);
    const createButton = screen.getByRole('button', { name: 'Create' });

    fireEvent.change(sellerInput, { target: { value: 'invalid-address' } });
    fireEvent.click(createButton);

    const errorMessage = await screen.findByText('Invalid seller address');
    expect(errorMessage).toBeInTheDocument();
    expect(mockWeb3Context.createEscrow).not.toHaveBeenCalled();
  });

  it('shows an error message if seller is the same as the buyer', async () => {
    render(<CreateEscrow />);
    fireEvent.click(screen.getByRole('button', { name: /create new escrow/i }));

    const sellerInput = screen.getByLabelText(/seller address/i);
    const createButton = screen.getByRole('button', { name: 'Create' });

    // Use the buyer's address from the mock context
    fireEvent.change(sellerInput, { target: { value: mockWeb3Context.account } });
    fireEvent.click(createButton);

    const errorMessage = await screen.findByText('Seller cannot be the same as the buyer.');
    expect(errorMessage).toBeInTheDocument();
    expect(mockWeb3Context.createEscrow).not.toHaveBeenCalled();
  });

  it('calls createEscrow with correct arguments on successful submission', async () => {
    const sellerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const arbiterAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

    render(<CreateEscrow />);
    fireEvent.click(screen.getByRole('button', { name: /create new escrow/i }));

    const sellerInput = screen.getByLabelText(/seller address/i);
    const arbiterInput = screen.getByLabelText(/arbiter address/i);
    const createButton = screen.getByRole('button', { name: 'Create' });

    fireEvent.change(sellerInput, { target: { value: sellerAddress } });
    fireEvent.change(arbiterInput, { target: { value: arbiterAddress } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockWeb3Context.createEscrow).toHaveBeenCalledWith(sellerAddress, arbiterAddress);
    });
  });

  it('uses a zero address for arbiter if the input is empty', async () => {
    const sellerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    render(<CreateEscrow />);
    fireEvent.click(screen.getByRole('button', { name: /create new escrow/i }));

    const sellerInput = screen.getByLabelText(/seller address/i);
    const createButton = screen.getByRole('button', { name: 'Create' });

    fireEvent.change(sellerInput, { target: { value: sellerAddress } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockWeb3Context.createEscrow).toHaveBeenCalledWith(sellerAddress, zeroAddress);
    });
  });
});
