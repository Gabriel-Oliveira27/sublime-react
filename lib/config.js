export const CONFIG = Object.freeze({
  API: Object.freeze({
    VERCEL_URL:      'https://sublime-react.vercel.app',
    WHATSAPP_NUMBER: '5588988568911',
    PIX_KEY:         'c7172483-c032-4694-86cd-eebec564c848',
  }),

  STORE: Object.freeze({
    DISCOUNT_PERCENT: 0,
    CART_KEY:         'sublime_cart',
    MAX_INSTALLMENTS: 12,
  }),

  ORIGIN: {
    STREET:       'Rua Itacy Rodovalho de Alencar, 110',
    NEIGHBORHOOD: 'Veneza',
    CITY:         'Iguatu',
    STATE:        'CE',
    CEP:          '63504-460',
    DISPLAY:      'Rua Itacy Rodovalho de Alencar, 110 — Veneza, próximo à Academia DM Fit',
    lat:          null,
    lon:          null,
  },

  INSTALLMENT_FEES: Object.freeze({
     1: 0.0379,  2: 0.0589,  3: 0.0689,  4: 0.0789,
     5: 0.0880,  6: 0.0997,  7: 0.1289,  8: 0.1372,
     9: 0.1505, 10: 0.1586, 11: 0.1674, 12: 0.1746,
  }),

  SHIPPING_TIERS: Object.freeze([
    { maxSubtotal: 129,  cost: 0.00 },
    { maxSubtotal: 200,  cost: 1.50 },
    { maxSubtotal: 270,  cost: 3.00 },
    { maxSubtotal: 349,  cost: 5.00 },
    { maxSubtotal: 419,  cost: 7.00 },
    { maxSubtotal: null, cost: 10.00 },
  ]),

  CAROUSEL_SLIDES: Object.freeze([
    {
      title:       '',
      description: '',
      image:       '/imagens_carrossel/homesublime.png',
      bg:          'linear-gradient(135deg, #E84D82 0%, #B89EE8 100%)',
    },
    {
      title:       '',
      description: '',
      image:       '/imagens_carrossel/entregasublime.png',
      bg:          'linear-gradient(135deg, #B89EE8 0%, #E84D82 100%)',
    },
    {
      title:       '',
      description: '',
      image:       '/imagens_carrossel/versatsublime.png',
      bg:          'linear-gradient(135deg, #E84D82 20%, #0b2340 100%)',
    },
  ]),
});