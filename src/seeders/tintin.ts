import type { LoggerService } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { AddressType } from "@prisma/client";

import { Key } from "@lightdotso/api/config/key";
import type { TinTinNetwork } from "@lightdotso/api/const/tintin";
import { tintinURL, tintinChainId } from "@lightdotso/api/const/tintin";
import { bulkWrite } from "@lightdotso/api/libs/cf/bulk";
import prisma from "@lightdotso/api/libs/prisma";
import { castAddress } from "@lightdotso/api/utils/castAddress";

export const seedTintin = async (
  network: TinTinNetwork,
  logger?: LoggerService,
) => {
  if (!logger) {
    logger = new Logger("seedTintin");
  }

  const tintinContractMapping = await fetch(tintinURL[network]).then(
    async res => {
      const data = await res.text();
      return JSON.parse(`[${data.replaceAll("}", "},").slice(0, -2)}]`);
    },
  );

  logger.log(
    `${Key.TIN_TIN}:::${tintinChainId[network]} Found ${tintinContractMapping.length} events`,
  );

  const chunk = (a, n) => {
    return [...Array(Math.ceil(a.length / n))].map((_, i) => {
      return a.slice(n * i, n + n * i);
    });
  };

  const chunks = chunk(tintinContractMapping, 1000);

  for (const id in chunks) {
    const chunk = chunks[id];

    const bulk = [];
    for (const tx of chunk) {
      bulk.push({
        key: `${Key.COVALENT}:::${tintinChainId[network]}:::${tx.tx_hash}`,
        value: JSON.stringify(tx),
      });
    }

    const [prismaResult, kvResult] = await Promise.all([
      prisma.address.createMany({
        data: chunk.map(tx => {
          return {
            id: castAddress(tx.address),
            chainId: tintinChainId[network],
            name: tx.name,
            userId: null,
            type: AddressType.CONTRACT,
          };
        }),
        skipDuplicates: true,
      }),
      bulkWrite(bulk),
    ]);

    logger.log(
      `${Key.TIN_TIN}:::${tintinChainId[network]} Created ${prismaResult.count} activities on prisma`,
    );
    logger.log(
      `${Key.TIN_TIN}:::${tintinChainId[network]} Resulted ${kvResult} on kv`,
    );
  }
};
