import { Module } from '@nestjs/common';
import { AlchemyModule } from './alchemy/alchemy.module';
import { BinanceModule } from './binance/binance.module';
import { CoinmarketcapModule } from './coinmarketcap/coinmarketcap.module';
import { SolanafmModule } from './solanafm/solanafm.module';
import { SolanaWeb3Module } from './solana-web3/solana-web3.module';
import { EvmWeb3Module } from './evm-web3/evm-web3.module';
import { PartnerMatrixModule } from './partner-matrix/partner-matrix.module';
import { GamanzaEngageModule } from './gamanza-engage/gamanza-engage.module';
import { MoonPayModule } from './moonpay/moonpay.module';
import { GoogleModule } from './google/google.module';
import { TatumModule } from './tatum/tatum.module';
import { SolscanModule } from './solscan/solscan.module';

@Module({
  imports: [
    AlchemyModule,
    BinanceModule,
    CoinmarketcapModule,
    EvmWeb3Module,
    SolanaWeb3Module,
    SolanafmModule,
    PartnerMatrixModule,
    GamanzaEngageModule,
    MoonPayModule,
    GoogleModule,
    TatumModule,
    SolscanModule,
  ],
})
export class ExternalModule {}
