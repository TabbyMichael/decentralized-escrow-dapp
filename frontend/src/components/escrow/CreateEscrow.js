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
  const [isLoading, setIsLoading] = useState(false);
  const [sellerError, setSellerError] = useState('');
  const [arbiterError, setArbiterError] = useState('');

  const validateAddresses = () => {
    let isValid = true;
    if (!ethers.isAddress(seller)) {
      setSellerError('Invalid seller address');
      isValid = false;
    } else if (seller.toLowerCase() === account?.toLowerCase()) {
      setSellerError('Seller cannot be the same as the buyer.');
      isValid = false;
    } else {
      setSellerError('');
    }

    // Arbiter can be empty, but if it's not, it must be valid
    const finalArbiter = arbiter.trim() === '' ? '0x0000000000000000000000000000000000000000' : arbiter;
    if (!ethers.isAddress(finalArbiter)) {
      setArbiterError('Invalid arbiter address');
      isValid = false;
    } else {
      setArbiterError('');
    }
    return isValid;
  };

  const handleCreateEscrow = async () => {
    if (!validateAddresses()) {
      return;
    }

    setIsLoading(true);
    const finalArbiter = arbiter.trim() === '' ? '0x0000000000000000000000000000000000000000' : arbiter;

    try {
      const result = await createEscrow(seller, finalArbiter);

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
              <FormControl isRequired isInvalid={!!sellerError}>
                <FormLabel>Seller Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                />
                <FormErrorMessage>{sellerError}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!arbiterError}>
                <FormLabel>Arbiter Address (optional)</FormLabel>
                <Input
                  placeholder="0x..."
                  value={arbiter}
                  onChange={(e) => setArbiter(e.target.value)}
                />
                <FormErrorMessage>{arbiterError}</FormErrorMessage>
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
