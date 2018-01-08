extension ShapedFruit where Shape: Pear {

}

extension TheQuickBrownFoxJumpsOverTheLazyDogTheQuickBrownFoxJumpsOverTheLazyDog where TheLazyDog: VeryLazyDog {

}

class Fox {
    func jump<Dog>(over: Dog) where Dog: LazyDog {

    }

    func theQuickBrownFoxJumpsOverTheLazyDogTheQuickBrownFoxJumpsOver<TheLazyDog>() where TheLazyDog: VeryLazyDog {

    }
}
