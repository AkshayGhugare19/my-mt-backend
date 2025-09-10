export type EvenBetCreateSessionResponse = {
  data: {
    id: string;
    type: 'session';
    attributes: {
      'user-id': string;
      'redirect-url': string;
      auth: string;
      'session-id': string;
    };
  };
};

export type EvenbetLogoutResponse = {
  data: {
    id: string;
    type: string;
    attributes: {
      message: string;
    };
  };
};
