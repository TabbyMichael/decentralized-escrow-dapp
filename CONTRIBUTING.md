# Contributing to the Decentralized Escrow dApp

First off, thank you for considering contributing! Your help is appreciated.

This document provides guidelines for contributing to this project.

## Table of Contents
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Styleguides](#styleguides)
  - [Git Commit Messages](#git-commit-messages)
  - [Solidity Styleguide](#solidity-styleguide)
  - [JavaScript Styleguide](#javascript-styleguide)

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please open an issue on GitHub. Please include:
- A clear and descriptive title.
- A detailed description of the bug, including steps to reproduce it.
- The expected behavior and what happened instead.
- Your environment details (e.g., browser, operating system, Node.js version).

### Suggesting Enhancements

If you have an idea for an enhancement, please open an issue on GitHub to discuss it. This allows us to coordinate efforts and prevent duplication of work.

### Pull Requests

1.  **Fork the repository** and create your branch from `main`.
2.  **Install dependencies**: `npm install` in the root and `cd frontend && npm install`.
3.  **Make your changes**.
4.  **Update tests**: If you change the smart contract, please update the tests in `test/`.
5.  **Ensure tests pass**: Run `npx hardhat test` to make sure all tests pass.
6.  **Commit your changes**: Use a clear and descriptive commit message (see [Styleguides](#styleguides)).
7.  **Push to your fork** and open a pull request to the `main` branch of the original repository.

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move file to..." not "Moves file to...").
- Limit the first line to 72 characters or less.
- Reference issues and pull requests liberally after the first line.

### Solidity Styleguide

Please follow the official [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.19/style-guide.html).

### JavaScript Styleguide

Please follow a standard JavaScript style. We use Prettier with its default settings for code formatting. Ensure your code is formatted before committing.
