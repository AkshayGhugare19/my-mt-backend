export type GetPlayerCardsInformationEntry = {
  _id: string;
  playerId: string;
  category: {
    _id: string;
    name: string;
  };
  rank: {
    _id: string;
    name: string;
    imageUrl: string;
  };
  level: {
    _id: string;
    levelNumber: number;
  };
  xpBalance: number;
  createdBy: {
    userId: string;
    username: string;
  };
  updatedBy: {
    userId: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  previousPeriod: {
    xpAccumulated: number;
    rank: {
      _id: string;
      name: string;
      imageUrl: string;
    };
    level: {
      _id: string;
      levelNumber: string;
    };
  };
};

export type GetPlayerCardsInformationResponse = {
  data: GetPlayerCardsInformationEntry[];
  nextPage: string;
};

export type GetPurchaseInformationResponse = {
  data: [
    {
      _id: string;
      __v: string;
      bonusRewardsCount: string;
      boosterRewardsCount: string;
      createdAt: string;
      externalProductRewardsCount: string;
      ordersCount: string;
      playerId: string;
      updatedAt: string;
    },
  ];
  nextPage: string;
};

export type GetRewardShopitemResponse = {
  data: [
    {
      _id: string;
      __v: string;
      createdAt: string;
      createdBy: {
        userId: string;
        username: string;
      };
      description: string;
      desktopImage: string;
      mobileImage: string;
      name: string;
      ranks: {
        ranks: string[];
      };
      remainingItems: string;
      reward: {
        externalProduct: {
          suppliers: string[];
          url: string;
        };
        price: {
          currency: string;
          realMoneyPrice: number;
          virtualCurrencyPrice: number;
        };
        status: string;
        type: 'external_product' | 'bonus' | 'xp';
        bonus?: { bonusId: string };
      };
      status: string;
      stock: string;
      tags: {
        tags: [
          {
            id: string;
            name: string;
          },
        ];
      };
      translations: {
        translations: [
          {
            description: string;
            language: string;
            name: string;
          },
        ];
      };
      updatedAt: string;
      order: string;
    },
  ];
  nextPage: string;
};

export type GetRewardShopOrderResponse = {
  data: [
    {
      _id: string;
      __v: string;
      activation: string;
      balanceRemainingItems: string;
      comments: {
        comments: [
          {
            comment: string;
            createdAt: string;
            createdBy: string;
            status: string;
          },
        ];
      };
      createdAt: string;
      dateOfPurchase: string;
      item: {
        description: string;
        desktopImage: string;
        itemId: string;
        mobileImage: string;
        name: string;
        reward: {
          externalProduct: {
            suppliers: string[];
            url: string;
          };
          price: {
            currency: string;
            realMoneyPrice: number;
            virtualCurrencyPrice: number;
          };
          status: string;
          type: string;
        };
      };
      playerId: string;
      playerLanguage: string;
      price: {
        currency: string;
        realMoneyPrice: number;
        virtualCurrencyPrice: number;
      };
      quantity: string;
      recipientName: string;
      rewardType: string;
      shippingAddress: {
        city: string;
        country: string;
        deliverInCasino: boolean;
        street: string;
        streetNumber: string;
        zipCode: string;
      };
      status: string;
      updatedAt: string;
      balanceAfter: string;
      balanceBefore: string;
      playerRank: {
        _id: string;
        name: string;
      };
    },
  ];
  nextPage: string;
};

export type GetRanksResponse = {
  data: [
    {
      _id: string;
      __v: string;
      createdAt: string;
      createdBy: {
        userId: string;
        username: string;
      };
      description: string;
      imageUrl: string;
      levels: {
        levels: string[];
      };
      name: string;
      status: string;
      tags: {
        tags: string[];
      };
      translations: {
        translations: string[];
      };
      updatedAt: string;
      updatedBy: {
        userId: string;
        username: string;
      };
      weight: string;
    },
  ];
  nextPage: string;
};

export type GetRanksLevelsResponse = {
  data: [
    {
      _id: string;
      createdBy: {
        userId: string;
        username: string;
      };
      status: string;
      updatedBy: {
        userId: string;
        username: string;
      };
      weight: number;
      xpRange: {
        start: number;
        end: number;
      };
      levelNumber: number;
      levelRewards: {
        categories: [
          {
            id: string;
            name: string;
            rewards: [
              {
                type: string;
                activation: string;
                timeFrame: string;
                boosterRate: number;
                translations: [
                  {
                    language: string;
                    description: string;
                  },
                ];
              },
            ];
          },
        ];
      };
      updatedAt: string;
      createdAt: string;
    },
  ];
};

export type GetRewardsInformationResponse = {
  data: [
    {
      _id: string;
      __v: string;
      activation: string;
      createdAt: string;
      date: string;
      earnedReward: {
        activation: string;
        boosterRate: number;
        timeFrame: string;
        translations: [
          {
            description: string;
            language: string;
          },
        ];
        type:
          | 'tokens'
          | 'bonus_offer'
          | 'level_booster'
          | 'xp'
          | 'token_booster';
        amount?: number;
        bonusOfferId?: string;
      };
      group: {
        groupId: string;
        totalItems: number;
      };
      metadata: {
        levelId: string;
        rankId: string;
      };
      playerCategoryId: string;
      playerId: string;
      source: string;
      status: string;
      updatedAt: string;
    },
  ];
  nextPage: string;
};
