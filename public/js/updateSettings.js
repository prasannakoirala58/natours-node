/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data' ie email and name
export const updateSettings = async (data, type) => {
  try {
    // for development
    // const url =
    //   type === 'password'
    //     ? 'http://localhost:3000/api/v1/users/updateMyPassword'
    //     : 'http://localhost:3000/api/v1/users/updateMe';

    // for production
    const url =
      type === 'password' ? '/api/v1/users/updateMyPassword' : '/api/v1/users/updateMe';

    console.log(url);

    // console.log(data);

    console.log(data.get('name'));
    console.log(data.get('email'));
    console.log(data.get('photo'));

    // Convert FormData to a regular JS object and then send it to the axios
    // const formDataObject = {};
    // for (let [key, value] of data.entries()) {
    //   formDataObject[key] = value;
    // }

    // console.log(formDataObject.photo);
    // console.log(data);

    const res = await axios({
      url,
      method: 'PATCH',
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
