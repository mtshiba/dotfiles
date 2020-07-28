#...

DOTPATH=~/dotfiles

if [ "$SHELL" = "/bin/bash" ]; then
    ZSH_DIR=$(cat /etc/shells | grep zsh)
    # ZSH not found
    if [ -z "$ZSH_DIR" ]; then
        echo "please install and chsh zsh"; exit 1
    # ZSH found
    else
        chsh -s "$ZSH_DIR"
    fi
fi

for f in .??*; do
    [ "$f" = ".git" ] && continue
    ln -snfv "$DOTPATH/$f" "$HOME/$f"
done

# install oh-my-zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
# install syntax highlighting
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
# install autosuggestions
git clone https://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions
# install color scheme(powerlevel10k)
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k

source ~/.zshrc
