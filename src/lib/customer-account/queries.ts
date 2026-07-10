export const GET_CUSTOMER = /* GraphQL */ `
  query GetCustomer {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      defaultAddress {
        id
        formatted(withName: true)
      }
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          statusPageUrl
          totalPrice {
            amount
            currencyCode
          }
          lineItems(first: 5) {
            nodes {
              title
              quantity
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;
