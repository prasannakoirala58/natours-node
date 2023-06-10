/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51NBTVPDECaOyDfTw87zaWpoyhhJH8BR8m4tUhzCweAastrDfDpAoj1VvN7eSUp4om5upOkz6YsRJ9vAkzBHSWudW00SyQFlUha'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API (for development)
    // const session = await axios(
    //   `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    // );
    // 1) Get checkout session from API (for production)
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // redirect to success.url
    if (session.data.status === 'success') {
      showAlert('success', 'Redirecting to checkout...');
      window.setTimeout(() => {
        location.assign(session.data.session.url);
      }, 1500);
    }

    // 2) Create checkout form + charge credit card
    // await stripe.redirectToCheckout({
    //   sessionId: 'cs_test_a1r4ssdtJcwj2Wl3tQSdzAEHvMWWOgijQaAONonqiWfXHHzkZOZimszn58',
    // });
    // console.log('The session id is: ', session.data.session.id);
  } catch (error) {
    console.log(error);
    showAlert('error in making payment', error);
  }
};
