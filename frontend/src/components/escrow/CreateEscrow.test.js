import React from 'react';
import { render, screen, fireEvent, within, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Web3Context } from '../../context/Web3Context';
import CreateEscrow from './CreateEscrow';

// Mock the toaster since it's used in the Web3Context and can cause issues in tests
jest.mock('../ui/toaster', () => ({
  toaster: {
    create: jest.fn(),
  },
}));

const mockCreateEscrow = jest.fn();

import { ChakraProvider } from '@chakra-ui/react';

const customRender = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <ChakraProvider>
      <Web3Context.Provider value={providerProps}>{ui}</Web3Context.Provider>
    </ChakraProvider>,
    renderOptions
  );
};

describe('CreateEscrow Component', () => {
  let providerProps;

  beforeEach(() => {
    providerProps = {
      createEscrow: mockCreateEscrow.mockResolvedValue({ success: true, address: '0xNewEscrow' }),
    };
    mockCreateEscrow.mockClear();
  });

  test('modal opens and closes correctly', async () => {
    customRender(<CreateEscrow />, { providerProps });

    // Modal should be closed initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open modal
    const openButton = screen.getByRole('button', { name: /Create New Escrow/i });
    userEvent.click(openButton);

    // Use findByRole to wait for the modal to appear
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    // The header element doesn't have a 'heading' role, so we find by text.
    expect(screen.getByText('Create a New Escrow')).toBeInTheDocument();

    // Close modal with cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    userEvent.click(cancelButton);

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows validation error for invalid seller address', async () => {
    customRender(<CreateEscrow />, { providerProps });
    userEvent.click(screen.getByRole('button', { name: /Create New Escrow/i }));

    const modal = await screen.findByRole('dialog');
    const sellerInput = within(modal).getByLabelText(/Seller Address/i);
    await userEvent.type(sellerInput, 'invalid-address');

    const createButton = within(modal).getByRole('button', { name: 'Create' });
    userEvent.click(createButton);

    expect(await within(modal).findByText(/Invalid seller address/i)).toBeInTheDocument();
    expect(mockCreateEscrow).not.toHaveBeenCalled();
  });

  test('shows validation error for invalid arbiter address', async () => {
    customRender(<CreateEscrow />, { providerProps });
    userEvent.click(screen.getByRole('button', { name: /Create New Escrow/i }));

    const modal = await screen.findByRole('dialog');
    const sellerInput = within(modal).getByLabelText(/Seller Address/i);
    await userEvent.type(sellerInput, '0x1234567890123456789012345678901234567890');
    const arbiterInput = within(modal).getByLabelText(/Arbiter Address/i);
    await userEvent.type(arbiterInput, 'invalid-address');

    const createButton = within(modal).getByRole('button', { name: 'Create' });
    userEvent.click(createButton);

    expect(await within(modal).findByText(/Invalid arbiter address/i)).toBeInTheDocument();
    expect(mockCreateEscrow).not.toHaveBeenCalled();
  });

  test('successfully creates an escrow with valid addresses', async () => {
    customRender(<CreateEscrow />, { providerProps });
    userEvent.click(screen.getByRole('button', { name: /Create New Escrow/i }));

    const modal = await screen.findByRole('dialog');
    const sellerAddress = '0x1234567890123456789012345678901234567890';
    const arbiterAddress = '0x0987654321098765432109876543210987654321';

    const sellerInput = within(modal).getByLabelText(/Seller Address/i);
    await userEvent.type(sellerInput, sellerAddress);
    const arbiterInput = within(modal).getByLabelText(/Arbiter Address/i);
    await userEvent.type(arbiterInput, arbiterAddress);

    const createButton = within(modal).getByRole('button', { name: 'Create' });
    await userEvent.click(createButton);

    expect(mockCreateEscrow).toHaveBeenCalledWith(sellerAddress, arbiterAddress);

    // Check that the modal closes on successful submission
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('allows empty arbiter address and submits with zero address', async () => {
    customRender(<CreateEscrow />, { providerProps });
    userEvent.click(screen.getByRole('button', { name: /Create New Escrow/i }));

    const modal = await screen.findByRole('dialog');
    const sellerAddress = '0x1234567890123456789012345678901234567890';
    const emptyArbiterAddress = '0x0000000000000000000000000000000000000000';

    const sellerInput = within(modal).getByLabelText(/Seller Address/i);
    await userEvent.type(sellerInput, sellerAddress);

    // Arbiter input is left empty

    const createButton = within(modal).getByRole('button', { name: 'Create' });
    await userEvent.click(createButton);

    expect(mockCreateEscrow).toHaveBeenCalledWith(sellerAddress, emptyArbiterAddress);
  });
});
