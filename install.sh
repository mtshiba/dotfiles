#...

DOTPATH=${HOME}/dotfiles

type curl > /dev/null 2>&1 || (echo "please install curl"; exit 1)
type git > /dev/null 2>&1 || (echo "please install git"; exit 1)

if [ "$SHELL" = "/bin/bash" ]; then
    ZSH_DIR=$(cat /etc/shells | grep zsh)
    # ZSH not found
    if [ -z "$ZSH_DIR" ]; then
        echo "please install and chsh to zsh"; exit 1
    # ZSH found
    else
        chsh -s "$ZSH_DIR"
    fi
fi

for f in .??*; do
    [ "$f" = ".git" ] && continue
    ln -snfv "${DOTPATH}/$f" "${HOME}/$f"
done

# install oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
# install syntax highlighting
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
# install autosuggestions
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
# install color scheme(powerlevel10k)
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k

# install gcc, make
# if ubuntu, execute apt, if mac, execute brew
if [ "$(uname)" = "Darwin" ]; then
    brew install gcc make
elif [ "$(expr substr $(uname -s) 1 5)" = "Linux" ]; then
    sudo apt install gcc make
fi

# install rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
