import React, { useState } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';

const CreateEscrow = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { createEscrow, account } = useWeb3(); // Use the context function
  const toast = useToast();

  const [seller, setSeller] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!ethers.isAddress(seller)) {
      newErrors.seller = 'Invalid seller address';
    } else if (seller.toLowerCase() === account?.toLowerCase()) {
      newErrors.seller = 'Seller cannot be the same as the buyer.';
    }

    const finalArbiter = arbiter.trim() === '' ? '0x0000000000000000000000000000000000000000' : arbiter;
    if (!ethers.isAddress(finalArbiter)) {
      newErrors.arbiter = 'Invalid arbiter address';
    }

    if (!ethers.isAddress(token)) {
      newErrors.token = 'Invalid token address';
    }

    try {
      if (!amount || parseFloat(amount) <= 0) {
        newErrors.amount = 'Amount must be a positive number.';
      }
      ethers.parseUnits(amount, 18); // Assume 18 decimals for validation
    } catch {
      newErrors.amount = 'Invalid amount format.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateEscrow = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const finalArbiter = arbiter.trim() === '' ? '0x0000000000000000000000000000000000000000' : arbiter;
    const finalAmount = ethers.parseUnits(amount, 18); // Assuming 18 decimals

    try {
      const result = await createEscrow(seller, finalArbiter, token, finalAmount);

      if (result.success) {
        toast({
          title: 'Escrow Created!',
          description: `New escrow created at address: ${result.address}`,
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
        onClose();
        // Reset form
        setSeller('');
        setArbiter('');
      } else {
        throw result.error || new Error('An unknown error occurred');
      }
    } catch (error) {
      console.error('Error creating escrow:', error);
      toast({
        title: 'Error Creating Escrow',
        description: error.message || 'There was an error creating the escrow.',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={onOpen} colorScheme="purple">
        Create New Escrow
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create a New Escrow</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired isInvalid={!!errors.seller}>
                <FormLabel>Seller Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                />
                <FormErrorMessage>{errors.seller}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.arbiter}>
                <FormLabel>Arbiter Address (optional)</FormLabel>
                <Input
                  placeholder="0x..."
                  value={arbiter}
                  onChange={(e) => setArbiter(e.target.value)}
                />
                <FormErrorMessage>{errors.arbiter}</FormErrorMessage>
              </FormControl>
              <FormControl isRequired isInvalid={!!errors.token}>
                <FormLabel>ERC20 Token Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <FormErrorMessage>{errors.token}</FormErrorMessage>
              </FormControl>
              <FormControl isRequired isInvalid={!!errors.amount}>
                <FormLabel>Amount</FormLabel>
                <Input
                  placeholder="100.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <FormErrorMessage>{errors.amount}</FormErrorMessage>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              isLoading={isLoading}
              onClick={handleCreateEscrow}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreateEscrow;
