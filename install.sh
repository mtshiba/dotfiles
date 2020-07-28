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
