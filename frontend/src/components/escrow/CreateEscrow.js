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
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import EscrowFactoryArtifact from '../../artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';

const FACTORY_ADDRESS = process.env.REACT_APP_FACTORY_ADDRESS;

const CreateEscrow = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { signer } = useWeb3();
  const toast = useToast();

  const [seller, setSeller] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateEscrow = async () => {
    if (!signer) {
      toast({ title: 'Please connect your wallet', status: 'warning' });
      return;
    }
    if (!ethers.isAddress(seller) || !ethers.isAddress(arbiter)) {
      toast({ title: 'Please enter valid seller and arbiter addresses', status: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const factoryContract = new ethers.Contract(
        FACTORY_ADDRESS,
        EscrowFactoryArtifact.abi,
        signer
      );

      const tx = await factoryContract.createEscrow(seller, arbiter);
      await tx.wait();

      toast({
        title: 'Escrow Created!',
        description: `Transaction successful: ${tx.hash}`,
        status: 'success',
        duration: 9000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error('Error creating escrow:', error);
      toast({
        title: 'Error creating escrow',
        description: error.message,
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
