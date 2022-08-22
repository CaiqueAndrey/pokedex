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
    /* background: #EFEFBB;
    background: linear-gradient(to right, rgb(197, 230, 236), rgb(239, 187, 230)); */
    background: rgb(255,255,255);
    background: linear-gradient(
      90deg, rgba(255,255,255,1) 22%,
      rgba(160,160,160,1) 100%,
      rgba(72,72,72,1) 100%
    );
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
