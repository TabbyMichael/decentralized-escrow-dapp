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
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';
import { useWeb3 } from '../../context/Web3Context';

const CreateEscrow = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { createEscrow } = useWeb3();
  const [seller, setSeller] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!seller || !arbiter) {
      toast({
        title: 'Missing fields',
        description: 'Please provide both a seller and an arbiter address.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createEscrow(seller, arbiter);
      if (result.success) {
        toast({
          title: 'Escrow Created!',
          description: `New escrow contract deployed at ${result.address}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onClose();
        setSeller('');
        setArbiter('');
      } else {
        throw new Error(result.error || 'Failed to create escrow.');
      }
    } catch (error) {
      toast({
        title: 'Error Creating Escrow',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={onOpen} leftIcon={<FaPlus />} colorScheme="purple">
        Create New Escrow
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create a New Escrow</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Seller Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Arbiter Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={arbiter}
                  onChange={(e) => setArbiter(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="Creating..."
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
