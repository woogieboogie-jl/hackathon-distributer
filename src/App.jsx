import './App.css';
import styled from 'styled-components';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const Container = styled.div`
  max-width: 420px;
  margin: 40px auto;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

function App() {
  const { address, isConnected } = useAccount();

  return (
    <Container>
      <h2>Web3 Faucet</h2>
      <ConnectButton />
      {isConnected ? (
        <>
          <div>
            <strong>Connected:</strong> {address}
          </div>
          <div>
            <strong>Faucet Address:</strong> <span style={{fontFamily: 'monospace'}}>0xYourFaucetAddress</span>
          </div>
          <div>
            <strong>Balances:</strong>
            <ul>
              <li>LINK: --</li>
              <li>AVAX: --</li>
              <li>USDC: --</li>
            </ul>
          </div>
          <form style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <label>Token:
              <select>
                <option value="LINK">LINK</option>
                <option value="AVAX">AVAX</option>
                <option value="USDC">USDC</option>
              </select>
            </label>
            <label>Amount:
              <input type="number" min="0.1" step="0.1" placeholder="Amount" />
            </label>
            <button type="submit">Request Tokens</button>
          </form>
          <div style={{color: '#888'}}>Status: (not implemented)</div>
        </>
      ) : (
        <div>Connect your wallet to request testnet tokens.</div>
      )}
    </Container>
  );
}

export default App;
