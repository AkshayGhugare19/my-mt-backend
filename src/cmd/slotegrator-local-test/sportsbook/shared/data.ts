/* eslint-disable sonarjs/no-duplicate-string */
export const data = {
  bet: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 10000,
      },
    },
    {
      request: {
        id: 'aa2l689qu1vvcb1mmy7fyaxq',
        url: '/api/slotegrator/sportsbook/event/bet',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [{
              uuid: '673f3832-e508-1904-39d5-800020000000',
              provider_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
              event_id: '2511148703184719898',
              parameters: {
                odds: '1.12',
                is_live: false,
              },
            }],
            parameters: {
              is_quick_bet: true,
            },
          },
          transaction_id: '673f3832-e530-19e8-3938-800010000000',
          action: 'bet',
        },
      },
      response: {
        transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
        balance: 9911.62,
      },
    },
  ],
  commit: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
        },
      },
      response: {
        balance: 10000,
      },
    },
    {
      request: {
        id: 'aa2l689qu1vvcb1mmy7fyaxq',
        url: '/api/slotegrator/sportsbook/event/commit',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [{ uuid: '67d1e64e-4d60-181e-37cd-800030000113', provider_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199', event_id: '2511148703184719898', parameters: { odds: '1.12', is_live: false, sport_id: '5', scheduled: 1741827600, sport_name: 'Tennis', category_id: '2470632731206365198', market_name: 'Winner', outcome_name: 'Alcaraz, Carlos', category_name: 'USA', tournament_id: '2508214189219258383', competitor_name: ['Dimitrov, Grigor', 'Alcaraz, Carlos'], tournament_name: 'ATP Indian Wells' }, status: 'open' }],
            parameters: {
              is_quick_bet: true,
            },
          },
          transaction_id: '673f3832-e530-19e8-3938-800010000000',
          action: 'commit',
        },
      },
      response: {
        balance: 10000,
      },
    },
  ],
  win: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 9911.62,
      },
    },
    {
      request: {
        id: 'owjf7su2eftbp3fl17k4z08p',
        url: '/api/slotegrator/sportsbook/event/win',
        method: 'POST',
        body: {
          amount: 101.06,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [{ uuid: '67d1e64e-4d60-181e-37cd-800030000113', provider_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199', event_id: '2511148703184719898', parameters: { odds: '1.12', is_live: false, sport_id: '5', scheduled: 1741827600, sport_name: 'Tennis', category_id: '2470632731206365198', market_name: 'Winner', outcome_name: 'Alcaraz, Carlos', category_name: 'USA', tournament_id: '2508214189219258383', competitor_name: ['Dimitrov, Grigor', 'Alcaraz, Carlos'], tournament_name: 'ATP Indian Wells' }, status: 'win' }],
          },
          transaction_id: '673f3832-9a5c-1c61-333a-800010000002',
          action: 'win',
        },
      },
      response: {
        transaction_id: '99c70726-d6c6-429e-a673-faa23d115479',
        balance: 10012.68,
      },
    },
    {
      request: {
        id: 'u5ai93r0lzcg89lv47sdyzhs',
        url: '/api/slotegrator/sportsbook/event/settle',
        method: 'POST',
        body: {
          currency: 'USD',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          action: 'settle',
        },
      },
      response: {
        balance: 10012.68,
        status: 'settled',
      },
    },
  ],
  lose: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 9933.22,
      },
    },
    {
      request: {
        id: 'owjf7su2eftbp3fl17k4z08p',
        url: '/api/slotegrator/sportsbook/event/win',
        method: 'POST',
        body: {
          amount: 0,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [{ uuid: '67d1e64e-4d60-181e-37cd-800030000113', provider_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199', event_id: '2511148703184719898', parameters: { odds: '1.12', is_live: false, sport_id: '5', scheduled: 1741827600, sport_name: 'Tennis', category_id: '2470632731206365198', market_name: 'Winner', outcome_name: 'Alcaraz, Carlos', category_name: 'USA', tournament_id: '2508214189219258383', competitor_name: ['Dimitrov, Grigor', 'Alcaraz, Carlos'], tournament_name: 'ATP Indian Wells' }, status: 'open' }],
          },
          transaction_id: '673f3832-9a5c-1c61-333a-800010000002',
          action: 'win',
        },
      },
      response: {
        transaction_id: '99c70726-d6c6-429e-a673-faa23d115479',
        balance: 9933.22,
      },
    },
    {
      request: {
        id: 'u5ai93r0lzcg89lv47sdyzhs',
        url: '/api/slotegrator/sportsbook/event/settle',
        method: 'POST',
        body: {
          currency: 'USD',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          action: 'settle',
        },
      },
      response: {
        balance: 9933.22,
        status: 'settled',
      },
    },
  ],
  refund: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 9933.22,
      },
    },
    {
      request: {
        id: 'hfmnh8bpz3drxsp60ex7ythi',
        url: '/api/slotegrator/sportsbook/event/refund',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3834-6c57-198f-3035-800020000000',
          transaction_id: '673f3835-77ab-1788-323a-800010000002',
          ref_transaction_id: '673f3834-6c71-1910-37ce-800010000000',
          type: 'default',
          action: 'refund',
        },
      },
      response: {
        transaction_id: 'ae64d6e3-e6f2-4960-916d-1b0e2cc57c49',
        balance: 10021.60,
      },
    },
  ],
  cashout: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 9933.22,
      },
    },
    {
      request: {
        id: 'q3f98iafb7vs8fim3g44d4so',
        url: '/api/slotegrator/sportsbook/event/refund',
        method: 'POST',
        body: {
          amount: 89.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3843-11e2-1edf-3188-800020000000',
          transaction_id: '673f3844-ebe7-19de-3ce5-800010000002',
          ref_transaction_id: '673f3843-1202-1e18-3646-800010000000',
          type: 'cash_out',
          action: 'refund',
        },
      },
      response: {
        transaction_id: '5a3c478d-e089-400d-8ff2-9da1fcb1fa00',
        balance: 10022.60,
      },
    },
    {
      request: {
        id: 'sa2w9l19c1ml2zva5fikm81x',
        url: '/api/slotegrator/sportsbook/event/settle',
        method: 'POST',
        body: {
          currency: 'USD',
          betslip_id: '673f383a-fac7-1b05-3154-800020000000',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          action: 'settle',
        },
      },
      response: {
        balance: 9983.75,
        status: 'settled',
      },
    },
  ],
  betAndWin: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 10000,
      },
    },
    {
      request: {
        id: 'aa2l689qu1vvcb1mmy7fyaxq',
        url: '/api/slotegrator/sportsbook/event/bet',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [],
            parameters: {
              is_quick_bet: true,
            },
          },
          transaction_id: '673f3832-e530-19e8-3938-800010000000',
          action: 'bet',
        },
      },
      response: {
        transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
        balance: 9911.62,
      },
    },
    {
      request: {
        id: 'owjf7su2eftbp3fl17k4z08p',
        url: '/api/slotegrator/sportsbook/event/win',
        method: 'POST',
        body: {
          amount: 101.06,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [],
          },
          transaction_id: '673f3832-9a5c-1c61-333a-800010000002',
          action: 'win',
        },
      },
      response: {
        transaction_id: '99c70726-d6c6-429e-a673-faa23d115479',
        balance: 10012.68,
      },
    },
    {
      request: {
        id: 'u5ai93r0lzcg89lv47sdyzhs',
        url: '/api/slotegrator/sportsbook/event/settle',
        method: 'POST',
        body: {
          currency: 'USD',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          action: 'settle',
        },
      },
      response: {
        balance: 10012.68,
        status: 'settled',
      },
    },
  ],
  betAndLose: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 10000,
      },
    },
    {
      request: {
        id: 'aa2l689qu1vvcb1mmy7fyaxq',
        url: '/api/slotegrator/sportsbook/event/bet',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [],
            parameters: {
              is_quick_bet: true,
            },
          },
          transaction_id: '673f3832-e530-19e8-3938-800010000000',
          action: 'bet',
        },
      },
      response: {
        transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
        balance: 9911.62,
      },
    },
    {
      request: {
        id: 'owjf7su2eftbp3fl17k4z08p',
        url: '/api/slotegrator/sportsbook/event/win',
        method: 'POST',
        body: {
          amount: 0,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [],
          },
          transaction_id: '673f3832-9a5c-1c61-333a-800010000002',
          action: 'win',
        },
      },
      response: {
        transaction_id: '99c70726-d6c6-429e-a673-faa23d115479',
        balance: 9911.62,
      },
    },
    {
      request: {
        id: 'u5ai93r0lzcg89lv47sdyzhs',
        url: '/api/slotegrator/sportsbook/event/settle',
        method: 'POST',
        body: {
          currency: 'USD',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          bet_transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
          action: 'settle',
        },
      },
      response: {
        balance: 9911.62,
        status: 'settled',
      },
    },
  ],
  betAndRefund: [
    {
      request: {
        id: 'ndxbka0bnst6470oynnovv4l',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 10000,
      },
    },
    {
      request: {
        id: 'aa2l689qu1vvcb1mmy7fyaxq',
        url: '/api/slotegrator/sportsbook/event/bet',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3832-e508-1904-39d5-800020000000',
          betslip: {
            uuid: '673f3832-e508-1904-39d5-800020000000',
            provider_betslip_id: 'd595248f-75ff-454b-8d6d-e6a232dff199',
            status: 'open',
            amount: 88.38,
            currency: 'USD',
            items: [],
            parameters: {
              is_quick_bet: true,
            },
          },
          transaction_id: '673f3832-e530-19e8-3938-800010000000',
          action: 'bet',
        },
      },
      response: {
        transaction_id: '23bf4a2f-a3a8-46f5-9977-e73f6d2a7b22',
        balance: 9911.62,
      },
    },
    {
      request: {
        id: 'hfmnh8bpz3drxsp60ex7ythi',
        url: '/api/slotegrator/sportsbook/event/refund',
        method: 'POST',
        body: {
          amount: 88.38,
          currency: 'USD',
          sportsbook_uuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
          betslip_id: '673f3834-6c57-198f-3035-800020000000',
          transaction_id: '673f3835-77ab-1788-323a-800010000002',
          ref_transaction_id: '673f3834-6c71-1910-37ce-800010000000',
          type: 'default',
          action: 'refund',
        },
      },
      response: {
        transaction_id: 'ae64d6e3-e6f2-4960-916d-1b0e2cc57c49',
        balance: 10008.06,
      },
    },
  ],
  rollback: [
    {
      request: {
        id: 'd6twm6xltqgm13yjdqc4nczd',
        url: '/api/slotegrator/sportsbook/event/balance',
        method: 'POST',
        body: {
          action: 'balance',
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 10142.24,
      },
    },
    {
      request: {
        id: 'fsfttyevp83ft7j7ow2gtb6b',
        url: '/api/slotegrator/sportsbook/event/rollback',
        method: 'POST',
        body: {
          currency: 'USD',
          player_id: 'cm2nd6tt10001uh5b7xod2zpq',
          betslip_id: '673f3843-11e2-1edf-3188-800020000000',
          transaction_id: '673f3844-12a4-1acb-3d2b-800010000004',
          bet_transaction_id: '673f3843-1202-1e18-3646-800010000000',
          parent_transaction_id: '673f3844-ebe7-19de-3ce5-800010000002',
          amount: 165.79,
          action: 'rollback',
          session_id: '09356b07-f261-4aa6-a6fe-7a199a4b6c7f',
        },
      },
      response: {
        balance: 9976.45,
        transaction_id: '85cb138a-d226-49dd-b54a-c78a8dc9dd00',
      },
    },
  ],
};
