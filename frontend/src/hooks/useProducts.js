import { useEffect, useState } from "react";
import api from "../utils/api.js";

export function useProducts() {
  const [state, setState] = useState({
    error: "",
    loading: true,
    products: [],
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/products")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: "",
          loading: false,
          products: data.products || [],
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load products.",
          loading: false,
          products: [],
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}
