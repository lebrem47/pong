import { gql } from "@apollo/client";

export const PROFILE_QUERY = gql`
  query {
    getProfile {
      id
      name
      avatar
    }
  }
`;

export const CHATS_QUERY = gql`
  query {
    getProfile {
      id
      chats {
        id
        name
        members {
          name
          id
          avatar
        }
        owner {
          name
          id
          avatar
        }
        admins {
          name
          id
          avatar
        }
        type
      }
    }
  }
`;

export const MESSAGES_QUERY = gql`
  query Query($chatId: String!) {
    chat(id: $chatId) {
      messages {
        created_at
        message
        user {
          name
          id
          avatar
        }
      }
    }
  }
`;

export const USERS_QUERY = gql`
  query Query($usersOffset: Int!, $usersLimit: Int!) {
    users(offset: $usersOffset, limit: $usersLimit) {
      id
      name
      avatar
    }
  }
`;
