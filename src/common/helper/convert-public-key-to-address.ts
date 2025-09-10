import { ethers } from 'ethers';
import bs58check from 'bs58check';
import { PublicKey } from '@solana/web3.js';

const EC = require('elliptic').ec;

// Initialize the elliptic curve
const ec = new EC('secp256k1');

export function convertEthPublicKeyToAddress(publicKey: string): string {
  const key = ec.keyFromPublic(publicKey, 'hex');
  // Convert to uncompressed format
  const uncompressedPublicKey = key.getPublic().encode('hex').slice(2);

  // Now apply keccak
  const hash = ethers.keccak256('0x' + uncompressedPublicKey);

  const address = '0x' + hash.slice(-40);

  return ethers.getAddress(address);
}

export function convertTronPublicKeyToAddress(publicKey: string): string {
  const key = ec.keyFromPublic(publicKey, 'hex');
  const decompressedPublicKey = key.getPublic(false, 'hex').slice(2); // Remove the '04' prefix

  const hash = ethers.keccak256('0x' + decompressedPublicKey);

  const addressBytes = '41' + hash.slice(-40);

  return bs58check.encode(Buffer.from(addressBytes, 'hex'));
}

export function convertSolanaSECP2561k1PublicKeyToAddress(
  publicKey: string,
): string {
  const key = ec.keyFromPublic(publicKey, 'hex');
  const decompressedPublicKey = key.getPublic(false, 'hex').slice(2); // Remove the '04' prefix

  const publicKeyBuffer = Buffer.from(decompressedPublicKey, 'hex');
  return new PublicKey(publicKeyBuffer).toString();
}

export function convertSolanaED25519PublicKeyToAddress(
  publicKey: string,
): string {
  return new PublicKey(Buffer.from(publicKey, 'hex')).toString();
}
