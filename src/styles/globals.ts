import { createGlobalStyle } from 'styled-components';

export default createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    --title: #2E384D;
  }

  body {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    background: #EFEFBB;
    background: linear-gradient(to right, rgb(197, 230, 236), rgb(239, 187, 230));
    color: white;
    margin: 0;
  }

  body, input, textarea, button {
    font: 400 1rem 'Poppins', sans-serif;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    cursor: pointer;
  }

  @media(max-width: 1080px) {
    html {
      font-size: 93.75%; 
    }
  }

  @media(max-width: 768px) {
    html {
      font-size: 87.5%;
    }
  }
`;
