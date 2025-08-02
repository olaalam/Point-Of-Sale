
import axios from "axios";

export const loginAuth = async (emailOrUsername, password) => {
  const response = await axios.post("https://bcknd.sea-go.org/api/admin/login", {
    email: emailOrUsername,
    password,
  });
  return response.data;
};
