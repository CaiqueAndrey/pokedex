import styled from 'styled-components';

export const Div = styled.div`
    width: 100%;
    height: 15vh;
    margin: 0;
    padding: 2rem;
    background: ${props => props.theme.colors.header};

    display: flex;
    justify-content: space-between;
    align-items: center;

    strong {
        font-weight: 600;
        font-size: 3rem;
        color: ${props => props.theme.colors.text};
        margin-left: 1rem;
    }

    svg{
        width: 2rem;
        height: 2rem;
        color: ${props => props.theme.colors.text};
    }

    
    @media screen and (max-width:1400px){
        span {
            strong {
                font-size: 2.5rem;
                margin-left: 0.5rem;
            }
    
            svg{
                width: 2rem;
                height: 2rem;
            }
        }
    }

    @media screen and (max-width:768px){
        span {
            display: flex;
            justify-content: space-between;
            align-items: center;

            strong {
                font-size: 1.5rem;
                margin-left: 1rem;
            }
            
        }
        
    }
`;